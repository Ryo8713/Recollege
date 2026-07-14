import { computed, ref, watch, type Ref } from "vue";
import type { Asset, VenueAvailability } from "../types/rental";
import { useVenueLookupPreview, type VenueLookupPreview } from "./useVenueLookupPreview";

export interface LookupCalendarSection {
	key: string;
	label: string;
	dayCells: Array<{ date: string; day: number; available: boolean } | null>;
}

export interface AssetFirstOptions {
	selectableVenueAssets: Asset[];
	selectableEquipmentAssets: Asset[];
}

export interface AssetFirstSelection {
	selectedLookupVenueId: string;
	selectedLookupEquipmentId: string;
	selectedLookupAssetId: string;
	selectedBorrowedAt: string;
	isLookupVenueSelected: boolean;
}

export interface AssetFirstLookupResult {
	lookupError: string;
	lookupLoading: boolean;
	lookupDates: string[];
	venueLookupPreviewLoading: boolean;
	venueLookupPreviewError: string;
	visibleVenueLookupPreviews: VenueLookupPreview[];
	lookupCalendarSections: LookupCalendarSection[];
}

interface UseAssetFirstLookupPanelParams {
	assets: Ref<Asset[]>;
	form: { borrowedAt: string };
	mode: Ref<"borrow" | "return">;
	borrowEntryMode: Ref<"dateFirst" | "assetFirst">;
	earliestBorrowDate: Ref<string>;
	selectedLookupAssetId: Ref<string>;
	lookupDates: Ref<string[]>;
	lookupLoading: Ref<boolean>;
	lookupError: Ref<string>;
	fetchVenueAvailabilityCached: (assetId: string, date: string) => Promise<VenueAvailability>;
}

export function useAssetFirstLookupPanel(params: UseAssetFirstLookupPanelParams) {
	const {
		assets,
		form,
		mode,
		borrowEntryMode,
		earliestBorrowDate,
		selectedLookupAssetId,
		lookupDates,
		lookupLoading,
		lookupError,
		fetchVenueAvailabilityCached,
	} = params;

	const selectedLookupVenueId = ref("");
	const selectedLookupEquipmentId = ref("");
	const isLookupVenueSelected = computed(() => Boolean(selectedLookupVenueId.value));

	const selectableVenueAssets = computed(() =>
		assets.value.filter((a) => a.status !== "停用中" && a.type === "venue"),
	);
	const selectableEquipmentAssets = computed(() =>
		assets.value.filter((a) => a.status !== "停用中" && a.type === "equipment"),
	);

	const {
		venueLookupPreviewLoading,
		venueLookupPreviewError,
		visibleVenueLookupPreviews,
		lookupCalendarSections,
		loadVenueLookupPreviews,
	} = useVenueLookupPreview({
		selectedLookupVenueId,
		lookupDates,
		earliestBorrowDate,
		fetchVenueAvailabilityCached,
	});

	function onLookupVenueIdChange(value: string) {
		selectedLookupVenueId.value = value;
		if (value) {
			selectedLookupEquipmentId.value = "";
			selectedLookupAssetId.value = value;
			return;
		}
		selectedLookupAssetId.value = selectedLookupEquipmentId.value || "";
	}

	function onLookupEquipmentIdChange(value: string) {
		selectedLookupEquipmentId.value = value;
		if (value) {
			selectedLookupVenueId.value = "";
			selectedLookupAssetId.value = value;
			return;
		}
		selectedLookupAssetId.value = selectedLookupVenueId.value || "";
	}

	const options = computed<AssetFirstOptions>(() => ({
		selectableVenueAssets: selectableVenueAssets.value,
		selectableEquipmentAssets: selectableEquipmentAssets.value,
	}));

	const selection = computed<AssetFirstSelection>(() => ({
		selectedLookupVenueId: selectedLookupVenueId.value,
		selectedLookupEquipmentId: selectedLookupEquipmentId.value,
		selectedLookupAssetId: selectedLookupAssetId.value,
		selectedBorrowedAt: form.borrowedAt,
		isLookupVenueSelected: isLookupVenueSelected.value,
	}));

	const lookupResult = computed<AssetFirstLookupResult>(() => ({
		lookupError: lookupError.value,
		lookupLoading: lookupLoading.value,
		lookupDates: lookupDates.value,
		venueLookupPreviewLoading: venueLookupPreviewLoading.value,
		venueLookupPreviewError: venueLookupPreviewError.value,
		visibleVenueLookupPreviews: visibleVenueLookupPreviews.value,
		lookupCalendarSections: lookupCalendarSections.value,
	}));

	const panelProps = computed(() => ({
		options: options.value,
		selection: selection.value,
		lookupResult: lookupResult.value,
	}));

	watch(
		() => [mode.value, borrowEntryMode.value, selectedLookupVenueId.value, lookupDates.value.join(",")],
		() => {
			if (mode.value !== "borrow" || borrowEntryMode.value !== "assetFirst") return;
			if (!selectedLookupVenueId.value || lookupDates.value.length === 0) return;
			void loadVenueLookupPreviews();
		},
	);

	return {
		panelProps,
		selectedLookupVenueId,
		selectedLookupEquipmentId,
		onLookupVenueIdChange,
		onLookupEquipmentIdChange,
	};
}
