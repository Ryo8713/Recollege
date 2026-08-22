import { computed, onMounted, ref, watch, type Ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";
import { addDays, getEquipmentReturnCandidateDates, isWorkingDayText } from "../utils/date";
import type { Asset, VenueAvailability } from "../types/rental";

type BorrowMode = "borrow" | "return";
type BorrowEntryMode = "dateFirst" | "assetFirst";

interface UseBorrowAvailabilityParams {
	assets: Ref<Asset[]>;
	form: {
		borrowedAt: string;
		expectedReturnAt: string;
	};
	mode: Ref<BorrowMode>;
	borrowEntryMode: Ref<BorrowEntryMode>;
	today: string;
	holidayDates: Ref<Set<string>>;
}

export function useBorrowAvailability(params: UseBorrowAvailabilityParams) {
	const { assets, form, mode, borrowEntryMode, today, holidayDates } = params;

	// ===== State =====
	const selectedAssetId = ref("");
	const selectedAssetType = ref<Asset["type"] | "">("");
	const availableVenues = ref<Asset[]>([]);
	const availableEquipments = ref<Asset[]>([]);
	const availabilityError = ref("");
	const availabilityLoading = ref(false);
	const availabilityRequestSeq = ref(0);
	const availabilityDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
	const AVAILABILITY_DEBOUNCE_MS = 120;
	const AVAILABILITY_WINDOW_DAYS = 30;
	const availabilityCache = new Map<string, { venues: Asset[]; equipments: Asset[] }>();
	const availabilityInFlight = new Map<string, Promise<{ venues: Asset[]; equipments: Asset[] }>>();

	const availableReturnDates = ref<string[]>([]);
	const returnDateLoading = ref(false);
	const returnDateError = ref("");
	const returnDateRequestSeq = ref(0);
	const returnDateCache = new Map<string, string[]>();
	const returnDateInFlight = new Map<string, Promise<string[]>>();

	const blockedRangesByAssetId = ref<Record<string, Array<{ start: string; end: string }>>>({});
	const globalPauseRanges = ref<Array<{ start: string; end: string }>>([]);
	const blockedRangesLoadedAt = ref(0);
	const blockedRangesRequestSeq = ref(0);
	let blockedRangesInFlight: Promise<boolean> | null = null;
	const BLOCKED_RANGES_TTL_MS = 60 * 1000;

	const selectedLookupAssetId = ref("");
	const lookupDates = ref<string[]>([]);
	const lookupLoading = ref(false);
	const lookupError = ref("");
	const lookupRequestSeq = ref(0);
	const lookupDatesCache = new Map<string, string[]>();
	const lookupDatesInFlight = new Map<string, Promise<string[]>>();

	const venueAvailability = ref<VenueAvailability | null>(null);
	const venueAvailabilityLoading = ref(false);
	const venueAvailabilityError = ref("");
	const venueAvailabilityRequestSeq = ref(0);
	const venueAvailabilityCache = new Map<string, VenueAvailability>();
	const venueAvailabilityInFlight = new Map<string, Promise<VenueAvailability>>();
	const venuePrecomputeQueuedKeys = new Set<string>();
	const venuePrecomputeQueue: Array<{ assetId: string; date: string }> = [];
	let venuePrecomputeActiveCount = 0;
	const VENUE_PRECOMPUTE_CONCURRENCY = 3;

	// ===== 通用小工具 =====
	function getAssets(): Asset[] {
		return assets.value;
	}

	function toHour(hhmm: string): number {
		return Number((hhmm || "").slice(0, 2));
	}

	function getDateWindow(fromDate: string, windowDays: number): string[] {
		const dates: string[] = [];
		for (let day = 0; day < windowDays; day += 1) {
			dates.push(addDays(fromDate, day));
		}
		return dates;
	}

	function isVenueAsset(assetId: string): boolean {
		return getAssets().some((asset) => asset.id === assetId && asset.type === "venue");
	}

	// ===== blocked ranges =====
	function shouldRefreshBlockedRanges(): boolean { 
		if (!blockedRangesLoadedAt.value) return true;
		return Date.now() - blockedRangesLoadedAt.value > BLOCKED_RANGES_TTL_MS;
	}

	async function loadBlockedRanges(force = false): Promise<boolean> {
		if (!force && blockedRangesInFlight) {
			return blockedRangesInFlight;
		}
		if (!force && !shouldRefreshBlockedRanges()) { //check cache is still valid
			return true;
		}

		const seq = ++blockedRangesRequestSeq.value;
		const request = (async () => {
			try {
				const response = await sheetsApi.fetchAssetBlockedRanges();
				if (seq !== blockedRangesRequestSeq.value) {
					if (blockedRangesInFlight) return blockedRangesInFlight; // 改等最新
					return !shouldRefreshBlockedRanges(); // 最新已結束（或被清掉）才看快照
				}
				blockedRangesByAssetId.value = response.blockedRangesByAssetId ?? {};
				globalPauseRanges.value = response.globalPauseRanges ?? [];
				blockedRangesLoadedAt.value = Date.now();
				return true;
			} catch (_error) {
				if (seq !== blockedRangesRequestSeq.value) {
					if (blockedRangesInFlight) return blockedRangesInFlight;
					return !shouldRefreshBlockedRanges();
				}
				return false;
			} finally {
				if (seq === blockedRangesRequestSeq.value) {
					blockedRangesInFlight = null;
				}
			}
		})();
		blockedRangesInFlight = request;
		return request;
	}

	function isBlockedByRanges(startDate: string, endDate: string, ranges: Array<{ start: string; end: string }>,): boolean {
		return ranges.some( (range) => range.start <= endDate && range.end >= startDate);
	}

	function isBlockedOnDate(dateText: string, ranges: Array<{ start: string; end: string }>): boolean {
		return ranges.some((range) => range.start <= dateText && dateText <= range.end);
	}

	function isGloballyClosedDate(dateText: string): boolean {
		return globalPauseRanges.value.some((range) => range.start <= dateText && dateText <= range.end);
	}

	function getCombinedBlockedRanges(assetId: string): Array<{ start: string; end: string }> {
		const assetRanges = blockedRangesByAssetId.value[assetId] ?? [];
		return [...globalPauseRanges.value, ...assetRanges];
	}

	// ===== 本地可借計算 =====
	function hasAnyAvailableReturnDate(
		borrowedAt: string,
		ranges: Array<{ start: string; end: string }>,
	): boolean {
		for (const expectedReturnAt of getEquipmentReturnCandidateDates(borrowedAt, holidayDates.value)) {
			if (!isBlockedByRanges(borrowedAt, expectedReturnAt, ranges)) {
				return true;
			}
		}
		return false;
	}

	function computeAvailableReturnDatesLocally(assetId: string, borrowedAt: string): string[] {
		const asset = getAssets().find((item) => item.id === assetId);
		if (!asset || asset.status === "停用中") return [];
		if (isGloballyClosedDate(borrowedAt)) return [];

		const blockedRanges = getCombinedBlockedRanges(assetId);
		const dates: string[] = [];
		for (const expectedReturnAt of getEquipmentReturnCandidateDates(borrowedAt, holidayDates.value)) {
			if (!isBlockedByRanges(borrowedAt, expectedReturnAt, blockedRanges)) {
				dates.push(expectedReturnAt);
			}
		}
		return dates;
	}

	function computeAssetAvailabilityDatesLocally(assetId: string, fromDate: string, windowDays: number): string[] {
		const asset = getAssets().find((item) => item.id === assetId);
		if (!asset || asset.status === "停用中") return [];

		const blockedRanges = getCombinedBlockedRanges(assetId);
		const dates: string[] = [];
		for (let day = 0; day < windowDays; day += 1) {
			const startDate = addDays(fromDate, day);
			if (isGloballyClosedDate(startDate)) continue;
			if (!isWorkingDayText(startDate, holidayDates.value)) continue;
			if (hasAnyAvailableReturnDate(startDate, blockedRanges)) {
				dates.push(startDate);
			}
		}
		return dates;
	}

	function computeAvailableAssetsLocally(
		borrowedAt: string,
	): { venues: Asset[]; equipments: Asset[] } {
		const venues: Asset[] = [];
		const equipments: Asset[] = [];
		const allAssets = getAssets();
		for (let i = 0; i < allAssets.length; i += 1) {
			const asset = allAssets[i];
			const blockedRanges = blockedRangesByAssetId.value[asset.id] ?? [];
			if (asset.type === "venue") {
				if (!isBlockedOnDate(borrowedAt, blockedRanges)) venues.push(asset);
				continue;
			}
			if (!isWorkingDayText(borrowedAt, holidayDates.value)) continue;
			if (isBlockedOnDate(borrowedAt, blockedRanges)) continue;
			if (asset.type === "equipment") equipments.push(asset);
		}
		return { venues, equipments };
	}

	function applyAvailabilityResult(result: { venues: Asset[]; equipments: Asset[] }) {
		availableVenues.value = result.venues;
		availableEquipments.value = result.equipments;

		if (form.borrowedAt && result.venues.length > 0) {
			precomputeVenueAvailabilityInBackground(
				result.venues.map((venue) => venue.id),
				[form.borrowedAt],
			);
		}
	}

	function scheduleLoadAvailability() {
		if (availabilityDebounceTimer.value) {
			clearTimeout(availabilityDebounceTimer.value);
		}
		availabilityDebounceTimer.value = setTimeout(() => {
			availabilityDebounceTimer.value = null;
			void loadAvailability();
		}, AVAILABILITY_DEBOUNCE_MS);
	}

	async function loadAvailability() {
		if (!form.borrowedAt) return;
		availabilityError.value = "";
		const seq = ++availabilityRequestSeq.value;
		const cached = availabilityCache.get(form.borrowedAt);

		if (cached) {
			availabilityLoading.value = false;
			applyAvailabilityResult(cached);
			return;
		}

		availabilityLoading.value = true;
		try {
			const blockedRangesReady = await loadBlockedRanges();
			if (seq !== availabilityRequestSeq.value) return;
			
			if (isGloballyClosedDate(form.borrowedAt)) {
				availableVenues.value = [];
				availableEquipments.value = [];
				availableReturnDates.value = [];
				availabilityError.value = "";
				return;
			}
			if (blockedRangesReady && getAssets().length > 0) {
				const localResult = computeAvailableAssetsLocally(form.borrowedAt);
				availabilityCache.set(form.borrowedAt, localResult);
				applyAvailabilityResult(localResult);
				return;
			}
			else {
				availableVenues.value = [];
				availableEquipments.value = [];
				availableReturnDates.value = [];
				availabilityError.value = "本地計算失敗";
			}
		} catch (error) {
			if (seq !== availabilityRequestSeq.value) return;
			availableVenues.value = [];
			availableEquipments.value = [];
			availableReturnDates.value = [];
			availabilityError.value = error instanceof Error ? error.message : "loadAvailabilityerror";
		} finally {
			if (seq === availabilityRequestSeq.value) {
				if (selectedAssetId.value) {
					const availableIds = new Set([
						...availableVenues.value.map((v) => v.id),
						...availableEquipments.value.map((e) => e.id),
					]);
					
					if (!availableIds.has(selectedAssetId.value)) {
						selectedAssetId.value = "";
						selectedAssetType.value = "";
						availableReturnDates.value = [];
						form.expectedReturnAt = "";
					}
				}
				availabilityLoading.value = false;
			}
		}
	}

	// ===== 可歸還日期（設備）=====
	async function loadAvailableReturnDates() {
		availableReturnDates.value = [];
		returnDateError.value = "";
		if (!selectedAssetId.value || !form.borrowedAt) return;
		const seq = ++returnDateRequestSeq.value;
		const key = `${selectedAssetId.value}|${form.borrowedAt}`;
		const cached = returnDateCache.get(key);
		if (cached) {
			returnDateLoading.value = false;
			availableReturnDates.value = cached;
			return;
		}

		returnDateLoading.value = true;
		try {
			const blockedRanges = await loadBlockedRanges();
			if (seq !== returnDateRequestSeq.value) return;
			if (blockedRanges) {
				const dates = computeAvailableReturnDatesLocally(selectedAssetId.value, form.borrowedAt);
				returnDateCache.set(key, dates);
				availableReturnDates.value = dates;
				return;
			}

			const inFlight = returnDateInFlight.get(key);
			const request =
				inFlight ??
				sheetsApi
					.fetchAvailableReturnDates(selectedAssetId.value, form.borrowedAt)
					.then((result) => {
						const dates = result.dates ?? [];
						returnDateCache.set(key, dates);
						return dates;
					})
					.finally(() => {
						returnDateInFlight.delete(key);
					});
			if (!inFlight) {
				returnDateInFlight.set(key, request);
			}
			const dates = await request;
			if (seq !== returnDateRequestSeq.value) return;
			availableReturnDates.value = dates;
		} catch (error) {
			if (seq !== returnDateRequestSeq.value) return;
			returnDateError.value = error instanceof Error ? error.message : "讀取可歸還日期失敗";
		} finally {
			if (seq === returnDateRequestSeq.value) {
				returnDateLoading.value = false;
			}
		}
	}

	// ===== 可借日期查詢（asset-first）=====
	function precomputeLookupDatesInBackground(fromDate = today, windowDays = AVAILABILITY_WINDOW_DAYS) {
		const assetList = getAssets();
		if (assetList.length === 0) return;

		setTimeout(() => {
			for (let i = 0; i < assetList.length; i += 1) {
				const asset = assetList[i];
				if (asset.status === "停用中" || asset.type === "venue") continue;
				const key = `${asset.id}|${fromDate}|${windowDays}`;
				if (lookupDatesCache.has(key)) continue;
				const dates = computeAssetAvailabilityDatesLocally(asset.id, fromDate, windowDays);
				lookupDatesCache.set(key, dates);
			}
		}, 0);
	}

	async function loadAssetAvailabilityDates() {
		if (!selectedLookupAssetId.value) return;
		const seq = ++lookupRequestSeq.value;
		const key = `${selectedLookupAssetId.value}|${today}|${AVAILABILITY_WINDOW_DAYS}`;
		const cached = lookupDatesCache.get(key);
		if (cached) {
			lookupLoading.value = false;
			lookupError.value = "";
			lookupDates.value = cached;
			if (isVenueAsset(selectedLookupAssetId.value)) {
				precomputeVenueAvailabilityInBackground([selectedLookupAssetId.value], cached);
			}
			return;
		}
		lookupLoading.value = true;
		lookupError.value = "";
		lookupDates.value = [];

		try {
			const loaded = await loadBlockedRanges();
			if (seq !== lookupRequestSeq.value) return;
			if (loaded && getAssets().length > 0 && !isVenueAsset(selectedLookupAssetId.value)) {
				const dates = computeAssetAvailabilityDatesLocally(selectedLookupAssetId.value, today, AVAILABILITY_WINDOW_DAYS);
				lookupDatesCache.set(key, dates);
				lookupDates.value = dates;
				precomputeLookupDatesInBackground(today, AVAILABILITY_WINDOW_DAYS);
				return;
			}

			const inFlight = lookupDatesInFlight.get(key);
			const request =
				inFlight ??
				sheetsApi
					.fetchAssetAvailabilityDates(selectedLookupAssetId.value, today, AVAILABILITY_WINDOW_DAYS)
					.then((result) => {
						const dates = result.dates ?? [];
						lookupDatesCache.set(key, dates);
						return dates;
					})
					.finally(() => {
						lookupDatesInFlight.delete(key);
					});
			if (!inFlight) {
				lookupDatesInFlight.set(key, request);
			}
			const dates = await request;
			if (seq !== lookupRequestSeq.value) return;
			lookupDates.value = dates;
			if (isVenueAsset(selectedLookupAssetId.value)) {
				precomputeVenueAvailabilityInBackground([selectedLookupAssetId.value], dates);
			}
		} catch (error) {
			if (seq !== lookupRequestSeq.value) return;
			lookupError.value = error instanceof Error ? error.message : "查詢可借日期失敗";
		} finally {
			if (seq === lookupRequestSeq.value) {
				lookupLoading.value = false;
			}
		}
	}

	// ===== 空間可借時段（venue availability）=====
	function getVenueAvailabilityKey(assetId: string, date: string): string {
		return `${assetId}|${date}`;
	}

	const venueOccupiedHourSet = computed(() => {
		const set = new Set<number>();
		const availability = venueAvailability.value;
		if (!availability) return set;
		for (const interval of availability.occupied) {
			const start = toHour(interval.start);
			const end = toHour(interval.end);
			for (let hour = start; hour < end; hour += 1) {
				set.add(hour);
			}
		}
		return set;
	});

	const venueStartHours = computed<number[]>(() => {
		const availability = venueAvailability.value;
		if (!availability || availability.closed) return [];
		const openStart = toHour(availability.openStart);
		const openEnd = toHour(availability.openEnd);
		return Array.from({ length: openEnd - openStart }, (_, i) => openStart + i).filter(
			(hour) => !venueOccupiedHourSet.value.has(hour),
		);
	});

	async function fetchVenueAvailabilityCached(assetId: string, date: string): Promise<VenueAvailability> {
		const key = getVenueAvailabilityKey(assetId, date);
		const cached = venueAvailabilityCache.get(key);
		if (cached) return cached;

		const existingPromise = venueAvailabilityInFlight.get(key);
		if (existingPromise) return existingPromise;

		const request = sheetsApi
			.fetchVenueAvailability(assetId, date)
			.then((result) => {
				venueAvailabilityCache.set(key, result);
				return result;
			})
			.finally(() => {
				venueAvailabilityInFlight.delete(key);
			});
		venueAvailabilityInFlight.set(key, request);
		return request;
	}

	async function loadVenueAvailability(assetId: string, date: string) {
		venueAvailability.value = null;
		venueAvailabilityError.value = "";
		if (!assetId || !date) return;
		const seq = ++venueAvailabilityRequestSeq.value;
		const cached = venueAvailabilityCache.get(getVenueAvailabilityKey(assetId, date));
		if (cached) {
			venueAvailability.value = cached;
			venueAvailabilityLoading.value = false;
			return;
		}
		venueAvailabilityLoading.value = true;
		try {
			const result = await fetchVenueAvailabilityCached(assetId, date);
			if (seq !== venueAvailabilityRequestSeq.value) return;
			venueAvailability.value = result;
		} catch (error) {
			if (seq !== venueAvailabilityRequestSeq.value) return;
			venueAvailabilityError.value = error instanceof Error ? error.message : "讀取可借時段失敗";
		} finally {
			venueAvailabilityLoading.value = false;
		}
	}

	function precomputeVenueAvailabilityInBackground(assetIds: string[], dates: string[]) {
		if (assetIds.length === 0 || dates.length === 0) return;
		setTimeout(() => {
			for (const assetId of assetIds) {
				for (const date of dates) {
					const key = getVenueAvailabilityKey(assetId, date);
					if (venueAvailabilityCache.has(key) || venueAvailabilityInFlight.has(key) || venuePrecomputeQueuedKeys.has(key)) {
						continue;
					}
					venuePrecomputeQueuedKeys.add(key);
					venuePrecomputeQueue.push({ assetId, date });
				}
			}
			processVenuePrecomputeQueue();
		}, 0);
	}

	function processVenuePrecomputeQueue() {
		while (venuePrecomputeActiveCount < VENUE_PRECOMPUTE_CONCURRENCY && venuePrecomputeQueue.length > 0) {
			const job = venuePrecomputeQueue.shift();
			if (!job) return;
			const key = getVenueAvailabilityKey(job.assetId, job.date);
			venuePrecomputeQueuedKeys.delete(key);
			if (venueAvailabilityCache.has(key)) continue;

			venuePrecomputeActiveCount += 1;
			void fetchVenueAvailabilityCached(job.assetId, job.date)
				.catch(() => undefined)
				.finally(() => {
					venuePrecomputeActiveCount -= 1;
					processVenuePrecomputeQueue();
				});
		}
	}

	function precomputeAllVenueAvailabilityInBackground(windowDays = AVAILABILITY_WINDOW_DAYS) {
		const venueAssetIds = getAssets()
			.filter((asset) => asset.type === "venue" && asset.status !== "停用中")
			.map((asset) => asset.id);
		precomputeVenueAvailabilityInBackground(venueAssetIds, getDateWindow(today, windowDays));
	}

	// ===== 快取管理 =====
	function clearAvailabilityCaches() {
		availabilityCache.clear();
		availabilityInFlight.clear();
		returnDateCache.clear();
		returnDateInFlight.clear();
		lookupDatesCache.clear();
		lookupDatesInFlight.clear();
		venueAvailabilityCache.clear();
		venueAvailabilityInFlight.clear();
		venuePrecomputeQueuedKeys.clear();
		venuePrecomputeQueue.length = 0;
		blockedRangesInFlight = null;
	}

	// ===== 使用者操作 =====
	function selectAsset(id: string, type: Asset["type"]) {
		if (selectedAssetId.value === id) {
			selectedAssetId.value = "";
			selectedAssetType.value = "";
			return;
		}
		selectedAssetId.value = id;
		selectedAssetType.value = type;
	}

	function applyBorrowDate(date: string) {
		form.borrowedAt = date;
		form.expectedReturnAt = "";

		const selectedAsset = getAssets().find((a) => a.id === selectedLookupAssetId.value);
		if (selectedAsset) {
			selectedAssetId.value = selectedAsset.id;
			selectedAssetType.value = selectedAsset.type;
		}

		borrowEntryMode.value = "dateFirst";
		void loadAvailability();
		if (selectedAssetType.value === "venue") {
			void loadVenueAvailability(selectedAssetId.value, date);
		} else {
			void loadAvailableReturnDates();
		}
	}

	async function refreshBorrowAvailability() {
		clearAvailabilityCaches();
		await loadBlockedRanges(true);
		precomputeLookupDatesInBackground(today, AVAILABILITY_WINDOW_DAYS);
		precomputeAllVenueAvailabilityInBackground(AVAILABILITY_WINDOW_DAYS);
		if (mode.value !== "borrow") return;

		if (borrowEntryMode.value === "dateFirst") {
			if (form.borrowedAt) {
				await loadAvailability();
			}
			if (selectedAssetId.value && form.borrowedAt) {
				if (selectedAssetType.value === "venue") {
					await loadVenueAvailability(selectedAssetId.value, form.borrowedAt);
				} else {
					await loadAvailableReturnDates();
				}
			}
			return;
		}

		if (borrowEntryMode.value === "assetFirst" && selectedLookupAssetId.value) {
			await loadAssetAvailabilityDates();
		}
	}

	// ===== Watchers 與生命週期 =====
	watch(
		() => [form.borrowedAt, mode.value, borrowEntryMode.value],
		() => {
			if (mode.value !== "borrow") return;
			if (borrowEntryMode.value !== "dateFirst") return;
			scheduleLoadAvailability();
		},
		{ immediate: true },
	);

	watch(
		() => [selectedAssetId.value, form.borrowedAt, mode.value, borrowEntryMode.value],
		() => {
			if (mode.value !== "borrow" || borrowEntryMode.value !== "dateFirst") return;
			form.expectedReturnAt = "";
			if (selectedAssetType.value === "venue") {
				availableReturnDates.value = [];
				void loadVenueAvailability(selectedAssetId.value, form.borrowedAt);
			} else {
				venueAvailability.value = null;
				void loadAvailableReturnDates();
			}
		},
	);

	watch(
		() => selectedLookupAssetId.value,
		() => {
			lookupDates.value = [];
			lookupError.value = "";
			if (mode.value === "borrow" && borrowEntryMode.value === "assetFirst" && selectedLookupAssetId.value) {
				void loadAssetAvailabilityDates();
			}
		},
	);

	watch(
		() => borrowEntryMode.value,
		(modeValue) => {
			if (mode.value === "borrow" && modeValue === "assetFirst" && selectedLookupAssetId.value) {
				void loadAssetAvailabilityDates();
			}
		},
	);

	watch(
		() => assets.value.length,
		() => {
			if (!blockedRangesLoadedAt.value) return;
			precomputeLookupDatesInBackground(today, AVAILABILITY_WINDOW_DAYS);
			precomputeAllVenueAvailabilityInBackground(AVAILABILITY_WINDOW_DAYS);
		},
	);

	onMounted(() => {
		void loadBlockedRanges().then((loaded) => {
			if (loaded) {
				precomputeLookupDatesInBackground(today, AVAILABILITY_WINDOW_DAYS);
				precomputeAllVenueAvailabilityInBackground(AVAILABILITY_WINDOW_DAYS);
			}
		});
	});

	return {
		selectedAssetId,
		selectedAssetType,
		availableVenues,
		availableEquipments,
		availabilityError,
		availabilityLoading,
		availableReturnDates,
		returnDateLoading,
		returnDateError,
		selectedLookupAssetId,
		lookupDates,
		lookupLoading,
		lookupError,
		venueAvailability,
		venueAvailabilityLoading,
		venueAvailabilityError,
		venueStartHours,
		fetchVenueAvailabilityCached,
		selectAsset,
		applyBorrowDate,
		clearAvailabilityCaches,
		loadBlockedRanges,
		refreshBorrowAvailability,
	};
}
