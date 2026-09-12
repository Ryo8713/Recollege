import { computed, ref, watch, type Ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";
import { addDays, computeNextWorkingDay, isWorkingDayText } from "../utils/date";
import { getVenueOpenHours } from "../utils/venueHours";
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

	const venueAvailability = ref<VenueAvailability | null>(null);
	const venueStartHours = ref<number[]>([]);
	const venueAvailabilityLoading = ref(false);
	const venueAvailabilityError = ref("");
	const venueAvailabilityRequestSeq = ref(0);
	const venueAvailabilityCache = new Map<string, VenueAvailability>();
	const venueAvailabilityInFlight = new Map<string, Promise<VenueAvailability>>();

	// ===== blocked ranges =====
	function shouldRefreshBlockedRanges(): boolean { 
		if (!blockedRangesLoadedAt.value) return true;
		return Date.now() - blockedRangesLoadedAt.value > BLOCKED_RANGES_TTL_MS;
	}

	async function blockedRangesReady(force = false): Promise<boolean> {
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
				console.error("blockedRangesReady error", _error);
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

	function computeAvailableReturnDate(assetId: string, borrowedAt: string): string[] {
		const blockedRanges = getCombinedBlockedRanges(assetId);
		const expectedReturnAt = computeNextWorkingDay(borrowedAt, holidayDates.value);
		return isBlockedByRanges(borrowedAt, expectedReturnAt, blockedRanges) ? [borrowedAt] : [expectedReturnAt];
	}

	function computeAssetAvailabilityDates(assetId: string, fromDate: string, windowDays: number): string[] {
		const asset = assets.value.find((item) => item.id === assetId);
		if (!asset || asset.status === "停用中") return [];

		const dates: string[] = [];
		if (asset.type === "venue") {
			const pauseRanges = blockedRangesByAssetId.value[assetId] ?? [];
			for (let day = 0; day < windowDays; day += 1) {
				const startDate = addDays(fromDate, day);
				if (isGloballyClosedDate(startDate)) continue;
				if (isBlockedOnDate(startDate, pauseRanges)) continue;
				dates.push(startDate);
			}
			return dates;
		}

		const blockedRanges = getCombinedBlockedRanges(assetId);
		for (let day = 0; day < windowDays; day += 1) {
			const startDate = addDays(fromDate, day);
			if (isGloballyClosedDate(startDate)) continue;
			if (!isWorkingDayText(startDate, holidayDates.value)) continue;
			if (isBlockedOnDate(startDate, blockedRanges)) continue;
			dates.push(startDate);
		}
		return dates;
	}

	function computeAvailableAssets(
		borrowedAt: string,
	): { venues: Asset[]; equipments: Asset[] } {
		const venues: Asset[] = [];
		const equipments: Asset[] = [];
		const allAssets = assets.value;
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
	}

	function scheduleLoadAvailability() {
		if (availabilityDebounceTimer.value) {
			clearTimeout(availabilityDebounceTimer.value);
		}
		availabilityDebounceTimer.value = setTimeout(() => {
			availabilityDebounceTimer.value = null;
			void loadAvailableAssetsForDate();
		}, AVAILABILITY_DEBOUNCE_MS);
	}

	async function loadAvailableAssetsForDate() {
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
			const ready = await blockedRangesReady();
			if (seq !== availabilityRequestSeq.value) return;
			
			if (isGloballyClosedDate(form.borrowedAt)) {
				availableVenues.value = [];
				availableEquipments.value = [];
				availableReturnDates.value = [];
				availabilityError.value = "";
				return;
			}
			if (ready && assets.value.length > 0) {
				const localResult = computeAvailableAssets(form.borrowedAt);
				availabilityCache.set(form.borrowedAt, localResult);
				applyAvailabilityResult(localResult);
				return;
			}
			else {
				availableVenues.value = [];
				availableEquipments.value = [];
				availableReturnDates.value = [];
				if(!ready) availabilityError.value = "本地計算失敗";
				else if(assets.value.length === 0) availabilityError.value = "無法載入占用資料，請稍後再試";
			}
		} catch (error) {
			if (seq !== availabilityRequestSeq.value) return;
			availableVenues.value = [];
			availableEquipments.value = [];
			availableReturnDates.value = [];
			availabilityError.value = error instanceof Error ? error.message : "loadAvailableAssetsForDateerror";
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
			const ready = await blockedRangesReady();
			if (seq !== returnDateRequestSeq.value) return;
			if (!ready) {
				returnDateError.value = "無法載入占用資料，請稍後再試";
				return;
			}
			const date = computeAvailableReturnDate(selectedAssetId.value, form.borrowedAt);
			returnDateCache.set(key, date);
			availableReturnDates.value = date;
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
	async function loadAssetAvailabilityDates() {
		if (!selectedLookupAssetId.value) return;
		const seq = ++lookupRequestSeq.value;
		const key = `${selectedLookupAssetId.value}|${today}|${AVAILABILITY_WINDOW_DAYS}`;
		const cached = lookupDatesCache.get(key);
		if (cached) {
			lookupLoading.value = false;
			lookupError.value = "";
			lookupDates.value = cached;
			return;
		}
		lookupLoading.value = true;
		lookupError.value = "";
		lookupDates.value = [];

		try {
			const ready = await blockedRangesReady();
			if (seq !== lookupRequestSeq.value) return;
			if (!ready) {
				lookupError.value = "無法載入占用資料，請稍後再試";
				return;
			}
			const dates = computeAssetAvailabilityDates(
				selectedLookupAssetId.value,
				today,
				AVAILABILITY_WINDOW_DAYS,
			);
			lookupDatesCache.set(key, dates);
			lookupDates.value = dates;
		} catch (error) {
			if (seq !== lookupRequestSeq.value) return;
			lookupError.value = error instanceof Error ? error.message : "查詢可借日期失敗";
		} finally {
			if (seq === lookupRequestSeq.value) {
				lookupLoading.value = false;
			}
		}
	}

	async function getVenueAvailability(assetId: string, date: string): Promise<VenueAvailability> {
		const key = `${assetId}|${date}`;
		const cached = venueAvailabilityCache.get(key);
		if (cached) return cached;

		const existingPromise = venueAvailabilityInFlight.get(key);
		if (existingPromise) return existingPromise;

		const request = sheetsApi
			.fetchVenueOccupiedSlots(assetId, date)
			.then((result) => {
				const open = getVenueOpenHours(date, holidayDates.value);
				const occupied = result.occupied ?? [];
				const view: VenueAvailability = {
					assetId,
					date,
					openStart: open.start,
					openEnd: open.end,
					isHoliday: open.start === 8,
					occupied,
				};
				venueAvailabilityCache.set(key, view);
				return view;
			})
			.finally(() => {
				venueAvailabilityInFlight.delete(key);
			});
		venueAvailabilityInFlight.set(key, request);
		return request;
	}

	async function loadVenueAvailableHours(assetId: string, date: string): Promise<number[]> {
		venueStartHours.value = [];
		venueAvailabilityError.value = "";
		if (!assetId || !date) return [];
		const seq = ++venueAvailabilityRequestSeq.value;
		venueAvailabilityLoading.value = true;
		try {
			const availability = await getVenueAvailability(assetId, date);
			venueAvailability.value = availability;
			const open = getVenueOpenHours(date, holidayDates.value);
			const occupiedHours = new Set<number>();
			for (const interval of availability.occupied) {
				for (let hour = interval.start; hour < interval.end; hour += 1) {
					occupiedHours.add(hour);
				}
			}
			const availableHours = Array.from(
				{ length: open.end - open.start },
				(_, index) => open.start + index,
			).filter((hour) => !occupiedHours.has(hour));
			if (seq !== venueAvailabilityRequestSeq.value) return [];
			venueStartHours.value = availableHours;
			return availableHours;
		} catch (error) {
			if (seq !== venueAvailabilityRequestSeq.value) return [];
			venueAvailabilityError.value = error instanceof Error ? error.message : "讀取可借時段失敗";
			return [];
		} finally {
			venueAvailabilityLoading.value = false;
		}
	}

	
	function clearAvailabilityCaches() {
		availabilityCache.clear();
		availabilityInFlight.clear();
		returnDateCache.clear();
		lookupDatesCache.clear();
		venueAvailabilityCache.clear();
		venueAvailabilityInFlight.clear();
		blockedRangesInFlight = null;
	}

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

		const selectedAsset = assets.value.find((a) => a.id === selectedLookupAssetId.value);
		if (selectedAsset) {
			selectedAssetId.value = selectedAsset.id;
			selectedAssetType.value = selectedAsset.type;
		}

		borrowEntryMode.value = "dateFirst";
		void loadAvailableAssetsForDate();
		if (selectedAssetType.value === "venue") {
			void loadVenueAvailableHours(selectedAssetId.value, date);
		} else {
			void loadAvailableReturnDates();
		}
	}

	async function refreshBorrowAvailability() {
		clearAvailabilityCaches();
		await blockedRangesReady(true);
		if (mode.value !== "borrow") return;

		if (borrowEntryMode.value === "dateFirst") {
			if (form.borrowedAt) {
				await loadAvailableAssetsForDate();
			}
			if (selectedAssetId.value && form.borrowedAt) {
				if (selectedAssetType.value === "venue") {
					await loadVenueAvailableHours(selectedAssetId.value, form.borrowedAt);
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
				void loadVenueAvailableHours(selectedAssetId.value, form.borrowedAt);
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
		getVenueAvailability,
		selectAsset,
		applyBorrowDate,
		clearAvailabilityCaches,
		blockedRangesReady,
		refreshBorrowAvailability,
	};
}
