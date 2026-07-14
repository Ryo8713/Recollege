import { computed, watch, type Ref } from "vue";
import { computeNextWorkingDay, isWorkingDayText } from "../utils/date";
import type { BorrowFormState } from "../types/borrowForm";

export function useEquipmentReturnDate(params: {
	form: BorrowFormState;
	isVenueSelected: Ref<boolean>;
	selectedAssetId: Ref<string>;
	availableReturnDates: Ref<string[]>;
	returnDateLoading: Ref<boolean>;
	returnDateError: Ref<string>;
	holidayDates: Ref<Set<string>>;
}) {
	const { form, isVenueSelected, selectedAssetId, availableReturnDates, returnDateLoading, returnDateError, holidayDates } =
		params;

	const idealReturnDate = computed(() => {
		if (isVenueSelected.value || !form.borrowedAt) return "";
		return computeNextWorkingDay(form.borrowedAt, holidayDates.value);
	});

	const equipmentReturnDate = computed(() => {
		if (!idealReturnDate.value) return "";
		const candidates = availableReturnDates.value
			.filter((date) => date <= idealReturnDate.value && isWorkingDayText(date, holidayDates.value))
			.sort();
		if (candidates.length === 0) return "";
		return candidates[candidates.length - 1];
	});

	const isEquipmentReturnDateAdjusted = computed(
		() =>
			Boolean(equipmentReturnDate.value) &&
			Boolean(idealReturnDate.value) &&
			equipmentReturnDate.value < idealReturnDate.value,
	);

	const hasNoAvailableReturnDate = computed(() => {
		if (isVenueSelected.value || !selectedAssetId.value || !form.borrowedAt) return false;
		if (returnDateLoading.value || returnDateError.value) return false;
		return !equipmentReturnDate.value;
	});

	watch(
		[equipmentReturnDate, isVenueSelected, selectedAssetId],
		() => {
			if (isVenueSelected.value || !selectedAssetId.value) return;
			form.expectedReturnAt = equipmentReturnDate.value;
		},
		{ immediate: true },
	);

	return {
		idealReturnDate,
		equipmentReturnDate,
		isEquipmentReturnDateAdjusted,
		hasNoAvailableReturnDate,
	};
}
