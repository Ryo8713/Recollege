import { computed, ref, watch, type Ref } from "vue";
import { formatHourRangeLabel } from "../utils/venueHours";

export function useVenueSlotSelection(venueStartHours: Ref<number[]>) {
	const selectedVenueSlotHours = ref<number[]>([]);
	const selectedVenueSlotSet = computed(() => new Set(selectedVenueSlotHours.value));
	const sortedSelectedVenueSlotHours = computed(() => [...selectedVenueSlotHours.value].sort((a, b) => a - b));
	const selectedVenueStartHour = computed(() => sortedSelectedVenueSlotHours.value[0] ?? null);
	const selectedVenueEndHour = computed(() => {
		const selected = sortedSelectedVenueSlotHours.value;
		const lastHour = selected[selected.length - 1];
		return lastHour == null ? null : lastHour + 1;
	});
	const selectedVenueSlotLabels = computed(() =>
		sortedSelectedVenueSlotHours.value.map((hour) => formatHourRangeLabel(hour)),
	);
	const venueDurationHours = computed(() => selectedVenueSlotHours.value.length);

	function toggleVenueSlot(hour: number) {
		const selected = sortedSelectedVenueSlotHours.value;
		if (selected.length === 0) {
			selectedVenueSlotHours.value = [hour];
			return;
		}

		const min = selected[0];
		const max = selected[selected.length - 1];
		if (selectedVenueSlotSet.value.has(hour)) {
			if (hour === min || hour === max) {
				selectedVenueSlotHours.value = selected.filter((selectedHour) => selectedHour !== hour);
				return;
			}
			selectedVenueSlotHours.value = [hour];
			return;
		}

		if (hour === min - 1 || hour === max + 1) {
			selectedVenueSlotHours.value = [...selected, hour].sort((a, b) => a - b);
			return;
		}

		selectedVenueSlotHours.value = [hour];
	}

	function resetVenueSlots() {
		selectedVenueSlotHours.value = [];
	}

	watch(venueStartHours, (hours) => {
		const available = new Set(hours);
		const selected = selectedVenueSlotHours.value.filter((hour) => available.has(hour));
		if (selected.length !== selectedVenueSlotHours.value.length) {
			selectedVenueSlotHours.value = selected;
		}
	});

	return {
		selectedVenueSlotHours,
		selectedVenueSlotSet,
		selectedVenueStartHour,
		selectedVenueEndHour,
		selectedVenueSlotLabels,
		venueDurationHours,
		toggleVenueSlot,
		resetVenueSlots,
	};
}
