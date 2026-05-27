import { onMounted, ref, watch, type Ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";
import { addDays } from "../stores/rental";
import type { Asset } from "../types/rental";

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
}

export function useBorrowAvailability(params: UseBorrowAvailabilityParams) {
	const { assets, form, mode, borrowEntryMode, today } = params;

	function getAssets(): Asset[] {
		return assets.value;
	}

	const selectedAssetId = ref("");
	const selectedAssetType = ref<Asset["type"] | "">("");
	const availableVenues = ref<Asset[]>([]);
	const availableEquipments = ref<Asset[]>([]);
	const availabilityError = ref("");
	const availabilityLoading = ref(false);
	const availabilityRequestSeq = ref(0);
	const availabilityDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
	const AVAILABILITY_DEBOUNCE_MS = 120;
	const availabilityCache = new Map<string, { venues: Asset[]; equipments: Asset[] }>();
	const availabilityInFlight = new Map<string, Promise<{ venues: Asset[]; equipments: Asset[] }>>();

	const availableReturnDates = ref<string[]>([]);
	const returnDateLoading = ref(false);
	const returnDateError = ref("");
	const returnDateRequestSeq = ref(0);
	const returnDateCache = new Map<string, string[]>();
	const returnDateInFlight = new Map<string, Promise<string[]>>();

	const blockedRangesByAssetId = ref<Record<string, Array<{ start: string; end: string }>>>({});
	const blockedRangesLoadedAt = ref(0);
	const blockedRangesLoading = ref(false);
	const blockedRangesRequestSeq = ref(0);
	const BLOCKED_RANGES_TTL_MS = 60 * 1000;

	const selectedLookupAssetId = ref("");
	const lookupDates = ref<string[]>([]);
	const lookupLoading = ref(false);
	const lookupError = ref("");
	const lookupRequestSeq = ref(0);
	const lookupDatesCache = new Map<string, string[]>();
	const lookupDatesInFlight = new Map<string, Promise<string[]>>();

	function getAvailabilityKey(borrowedAt: string): string {
		return borrowedAt;
	}

	function getReturnDateKey(assetId: string, borrowedAt: string): string {
		return `${assetId}|${borrowedAt}`;
	}

	function getLookupDatesKey(assetId: string): string {
		return `${assetId}|${today}|30`;
	}

	function isDateRangeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
		return startA <= endB && endA >= startB;
	}

	function isBlockedByRanges(
		startDate: string,
		endDate: string,
		ranges: Array<{ start: string; end: string }>,
	): boolean {
		return ranges.some((range) => isDateRangeOverlapping(range.start, range.end, startDate, endDate));
	}

	function computeAvailableReturnDatesLocally(assetId: string, borrowedAt: string): string[] {
		const asset = getAssets().find((item) => item.id === assetId);
		if (!asset || asset.status === "停用中") return [];

		const blockedRanges = blockedRangesByAssetId.value[assetId] ?? [];
		const dates: string[] = [];
		for (let offset = 0; offset <= 6; offset += 1) {
			const expectedReturnAt = addDays(borrowedAt, offset);
			if (!isBlockedByRanges(borrowedAt, expectedReturnAt, blockedRanges)) {
				dates.push(expectedReturnAt);
			}
		}
		return dates;
	}

	function computeAssetAvailabilityDatesLocally(assetId: string, fromDate: string, windowDays: number): string[] {
		const asset = getAssets().find((item) => item.id === assetId);
		if (!asset || asset.status === "停用中") return [];

		const blockedRanges = blockedRangesByAssetId.value[assetId] ?? [];
		const dates: string[] = [];
		for (let day = 0; day < windowDays; day += 1) {
			const startDate = addDays(fromDate, day);
			if (hasAnyAvailableReturnDate(startDate, blockedRanges)) {
				dates.push(startDate);
			}
		}
		return dates;
	}

	function hasAnyAvailableReturnDate(
		borrowedAt: string,
		ranges: Array<{ start: string; end: string }>,
	): boolean {
		for (let offset = 0; offset <= 6; offset += 1) {
			const expectedReturnAt = addDays(borrowedAt, offset);
			if (!isBlockedByRanges(borrowedAt, expectedReturnAt, ranges)) {
				return true;
			}
		}
		return false;
	}

	function computeAvailableAssetsLocally(
		borrowedAt: string,
	): { venues: Asset[]; equipments: Asset[] } {
		const venues: Asset[] = [];
		const equipments: Asset[] = [];
		const allAssets = getAssets();
		for (let i = 0; i < allAssets.length; i += 1) {
			const asset = allAssets[i];
			if (asset.status === "停用中") continue;
			const blockedRanges = blockedRangesByAssetId.value[asset.id] ?? [];
			if (!hasAnyAvailableReturnDate(borrowedAt, blockedRanges)) continue;
			if (asset.type === "venue") venues.push(asset);
			if (asset.type === "equipment") equipments.push(asset);
		}
		return { venues, equipments };
	}

	function shouldRefreshBlockedRanges(): boolean {
		if (!blockedRangesLoadedAt.value) return true;
		return Date.now() - blockedRangesLoadedAt.value > BLOCKED_RANGES_TTL_MS;
	}

	function clearAvailabilityCaches() {
		availabilityCache.clear();
		availabilityInFlight.clear();
		returnDateCache.clear();
		returnDateInFlight.clear();
		lookupDatesCache.clear();
		lookupDatesInFlight.clear();
	}

	function precomputeLookupDatesInBackground(fromDate = today, windowDays = 30) {
		const assetList = getAssets();
		if (assetList.length === 0) return;

		setTimeout(() => {
			for (let i = 0; i < assetList.length; i += 1) {
				const asset = assetList[i];
				if (asset.status === "停用中") continue;
				const key = `${asset.id}|${fromDate}|${windowDays}`;
				if (lookupDatesCache.has(key)) continue;
				const dates = computeAssetAvailabilityDatesLocally(asset.id, fromDate, windowDays);
				lookupDatesCache.set(key, dates);
			}
		}, 0);
	}

	async function ensureBlockedRangesLoaded(force = false): Promise<boolean> {
		if (!force && !shouldRefreshBlockedRanges()) {
			return true;
		}

		const seq = ++blockedRangesRequestSeq.value;
		blockedRangesLoading.value = true;
		try {
			const response = await sheetsApi.fetchAssetBlockedRanges();
			if (seq !== blockedRangesRequestSeq.value) {
				return !shouldRefreshBlockedRanges();
			}
			blockedRangesByAssetId.value = response.blockedRangesByAssetId ?? {};
			blockedRangesLoadedAt.value = Date.now();
			return true;
		} catch (_error) {
			return false;
		} finally {
			if (seq === blockedRangesRequestSeq.value) {
				blockedRangesLoading.value = false;
			}
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

	function applyAvailabilityResult(result: { venues: Asset[]; equipments: Asset[] }) {
		availableVenues.value = result.venues;
		availableEquipments.value = result.equipments;

		const availableVenueIds = new Set(result.venues.map((v) => v.id));
		const availableEquipmentIds = new Set(result.equipments.map((e) => e.id));

		const stillAvailable =
			availableVenueIds.has(selectedAssetId.value) || availableEquipmentIds.has(selectedAssetId.value);
		if (selectedAssetId.value && !stillAvailable) {
			selectedAssetId.value = "";
			selectedAssetType.value = "";
			availableReturnDates.value = [];
			form.expectedReturnAt = "";
		}
	}

	async function fetchAvailabilityCached(borrowedAt: string): Promise<{ venues: Asset[]; equipments: Asset[] }> {
		const key = getAvailabilityKey(borrowedAt);
		const cached = availabilityCache.get(key);
		if (cached) return cached;

		const existingPromise = availabilityInFlight.get(key);
		if (existingPromise) return existingPromise;

		const request = sheetsApi
			.fetchAvailabilityByStartDate(borrowedAt)
			.then((result) => {
				const normalized = {
					venues: result.venues ?? [],
					equipments: result.equipments ?? [],
				};
				availabilityCache.set(key, normalized);
				return normalized;
			})
			.finally(() => {
				availabilityInFlight.delete(key);
			});
		availabilityInFlight.set(key, request);
		return request;
	}

	async function loadAvailability() {
		if (!form.borrowedAt) return;
		availabilityError.value = "";
		const seq = ++availabilityRequestSeq.value;
		const key = getAvailabilityKey(form.borrowedAt);
		const cached = availabilityCache.get(key);

		if (cached) {
			availabilityLoading.value = false;
			applyAvailabilityResult(cached);
			return;
		}

		availabilityLoading.value = true;
		try {
			const blockedRangesReady = await ensureBlockedRangesLoaded();
			if (seq !== availabilityRequestSeq.value) return;

			if (blockedRangesReady && getAssets().length > 0) {
				const localResult = computeAvailableAssetsLocally(form.borrowedAt);
				availabilityCache.set(key, localResult);
				applyAvailabilityResult(localResult);
				return;
			}

			const apiResult = await fetchAvailabilityCached(form.borrowedAt);
			if (seq !== availabilityRequestSeq.value) return;
			applyAvailabilityResult(apiResult);
		} catch (error) {
			if (seq !== availabilityRequestSeq.value) return;
			availableVenues.value = [];
			availableEquipments.value = [];
			availableReturnDates.value = [];
			availabilityError.value = error instanceof Error ? error.message : "讀取可借項目失敗";
		} finally {
			if (seq === availabilityRequestSeq.value) {
				availabilityLoading.value = false;
			}
		}
	}

	async function loadAvailableReturnDates() {
		availableReturnDates.value = [];
		returnDateError.value = "";
		if (!selectedAssetId.value || !form.borrowedAt) return;
		const seq = ++returnDateRequestSeq.value;
		const key = getReturnDateKey(selectedAssetId.value, form.borrowedAt);
		const cached = returnDateCache.get(key);
		if (cached) {
			returnDateLoading.value = false;
			availableReturnDates.value = cached;
			return;
		}

		returnDateLoading.value = true;
		try {
			const loaded = await ensureBlockedRangesLoaded();
			if (seq !== returnDateRequestSeq.value) return;
			if (loaded) {
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

	async function loadAssetAvailabilityDates() {
		if (!selectedLookupAssetId.value) return;
		const seq = ++lookupRequestSeq.value;
		const key = getLookupDatesKey(selectedLookupAssetId.value);
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
			const loaded = await ensureBlockedRangesLoaded();
			if (seq !== lookupRequestSeq.value) return;
			if (loaded && getAssets().length > 0) {
				const dates = computeAssetAvailabilityDatesLocally(selectedLookupAssetId.value, today, 30);
				lookupDatesCache.set(key, dates);
				lookupDates.value = dates;
				precomputeLookupDatesInBackground(today, 30);
				return;
			}

			const inFlight = lookupDatesInFlight.get(key);
			const request =
				inFlight ??
				sheetsApi
					.fetchAssetAvailabilityDates(selectedLookupAssetId.value, today, 30)
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
		} catch (error) {
			if (seq !== lookupRequestSeq.value) return;
			lookupError.value = error instanceof Error ? error.message : "查詢可借日期失敗";
		} finally {
			if (seq === lookupRequestSeq.value) {
				lookupLoading.value = false;
			}
		}
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

	function applySuggestedBorrowDate(date: string) {
		form.borrowedAt = date;
		form.expectedReturnAt = "";

		const selectedAsset = getAssets().find((a) => a.id === selectedLookupAssetId.value);
		if (selectedAsset) {
			selectedAssetId.value = selectedAsset.id;
			selectedAssetType.value = selectedAsset.type;
		}

		borrowEntryMode.value = "dateFirst";
		void loadAvailability();
		void loadAvailableReturnDates();
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
			void loadAvailableReturnDates();
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
			precomputeLookupDatesInBackground(today, 30);
		},
	);

	onMounted(() => {
		void ensureBlockedRangesLoaded().then((loaded) => {
			if (loaded) {
				precomputeLookupDatesInBackground(today, 30);
			}
		});
	});

	async function refreshBorrowAvailability() {
		clearAvailabilityCaches();
		await ensureBlockedRangesLoaded(true);
		precomputeLookupDatesInBackground(today, 30);
		if (mode.value !== "borrow") return;

		if (borrowEntryMode.value === "dateFirst") {
			if (form.borrowedAt) {
				await loadAvailability();
			}
			if (selectedAssetId.value && form.borrowedAt) {
				await loadAvailableReturnDates();
			}
			return;
		}

		if (borrowEntryMode.value === "assetFirst" && selectedLookupAssetId.value) {
			await loadAssetAvailabilityDates();
		}
	}

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
		selectAsset,
		applySuggestedBorrowDate,
		clearAvailabilityCaches,
		ensureBlockedRangesLoaded,
		refreshBorrowAvailability,
	};
}
