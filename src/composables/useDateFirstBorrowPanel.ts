import { computed, watch, type Ref } from "vue";
import type {
	BorrowFormState,
	DateFirstAvailability,
	DateFirstDateRules,
	DateFirstEquipmentReturn,
	DateFirstSubmitState,
	DateFirstVenueSlots,
} from "../types/borrowForm";
import type { Asset, VenueAvailability } from "../types/rental";
import { BORROW_LEAD_WORKING_DAYS } from "../utils/borrowRestrictions";
import { computeEarliestBorrowDate } from "../utils/date";
import { useEquipmentReturnDate } from "./useEquipmentReturnDate";
import { useVenueSlotSelection } from "./useVenueSlotSelection";

interface UseDateFirstBorrowPanelParams {
	form: BorrowFormState;
	today: string;
	holidayDates: Ref<Set<string>>;
	isSubmitting: Ref<boolean>;
	isStudentBorrowBlocked: Ref<boolean>;
	selectedAssetId: Ref<string>;
	selectedAssetType: Ref<Asset["type"] | "">;
	availableVenues: Ref<Asset[]>;
	availableEquipments: Ref<Asset[]>;
	availabilityLoading: Ref<boolean>;
	availabilityError: Ref<string>;
	availableReturnDates: Ref<string[]>;
	returnDateLoading: Ref<boolean>;
	returnDateError: Ref<string>;
	venueAvailability: Ref<VenueAvailability | null>;
	venueAvailabilityLoading: Ref<boolean>;
	venueAvailabilityError: Ref<string>;
	venueStartHours: Ref<number[]>;
}

export function useDateFirstBorrowPanel(params: UseDateFirstBorrowPanelParams) {
	const {
		form,
		today,
		holidayDates,
		isSubmitting,
		isStudentBorrowBlocked,
		selectedAssetId,
		selectedAssetType,
		availableVenues,
		availableEquipments,
		availabilityLoading,
		availabilityError,
		availableReturnDates,
		returnDateLoading,
		returnDateError,
		venueAvailability,
		venueAvailabilityLoading,
		venueAvailabilityError,
		venueStartHours,
	} = params;

	const earliestBorrowDate = computed(() =>
		computeEarliestBorrowDate(today, holidayDates.value, BORROW_LEAD_WORKING_DAYS),
	);

	const isVenueSelected = computed(() => selectedAssetType.value === "venue");

	const {
		selectedVenueSlotHours,
		selectedVenueSlotSet,
		selectedVenueStartHour,
		selectedVenueEndHour,
		selectedVenueSlotLabels,
		venueDurationHours,
		toggleVenueSlot,
		resetVenueSlots,
	} = useVenueSlotSelection(venueStartHours);

	const { equipmentReturnDate, hasNoAvailableReturnDate } = useEquipmentReturnDate({
		form,
		isVenueSelected,
		selectedAssetId,
		availableReturnDates,
		returnDateLoading,
		returnDateError,
		holidayDates,
	});

	const dateRules = computed<DateFirstDateRules>(() => ({
		earliestBorrowDate: earliestBorrowDate.value,
	}));

	const availability = computed<DateFirstAvailability>(() => ({
		availableVenues: availableVenues.value,
		availableEquipments: availableEquipments.value,
		selectedAssetId: selectedAssetId.value,
		selectedAssetType: selectedAssetType.value,
		loading: availabilityLoading.value,
		error: availabilityError.value,
	}));

	const venueSlots = computed<DateFirstVenueSlots>(() => ({
		selectedAssetId: selectedAssetId.value,
		venueAvailabilityLoading: venueAvailabilityLoading.value,
		venueAvailabilityError: venueAvailabilityError.value,
		venueAvailability: venueAvailability.value,
		venueStartHours: venueStartHours.value,
		selectedVenueSlotSet: selectedVenueSlotSet.value,
		selectedVenueSlotLabels: selectedVenueSlotLabels.value,
		venueDurationHours: venueDurationHours.value,
	}));

	const equipmentReturn = computed<DateFirstEquipmentReturn>(() => ({
		selectedAssetId: selectedAssetId.value,
		returnDateLoading: returnDateLoading.value,
		returnDateError: returnDateError.value,
		equipmentReturnDate: equipmentReturnDate.value,
		hasNoAvailableReturnDate: hasNoAvailableReturnDate.value,
	}));

	const submitState = computed<DateFirstSubmitState>(() => ({
		isStudentBorrowBlocked: isStudentBorrowBlocked.value,
		submitDisabled:
			isSubmitting.value ||
			availabilityLoading.value ||
			returnDateLoading.value ||
			isStudentBorrowBlocked.value,
	}));

	const panelProps = computed(() => ({
		dateRules: dateRules.value,
		availability: availability.value,
		venueSlots: venueSlots.value,
		equipmentReturn: equipmentReturn.value,
		submitState: submitState.value,
	}));

	watch(
		() => [selectedAssetId.value, form.borrowedAt],
		() => {
			resetVenueSlots();
		},
	);

	return {
		panelProps,
		earliestBorrowDate,
		isVenueSelected,
		selectedVenueSlotHours,
		selectedVenueStartHour,
		selectedVenueEndHour,
		selectedVenueSlotLabels,
		venueDurationHours,
		equipmentReturnDate,
		hasNoAvailableReturnDate,
		toggleVenueSlot,
		resetVenueSlots,
	};
}
