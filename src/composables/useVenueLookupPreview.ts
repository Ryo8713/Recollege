import { computed, ref, watch, type Ref } from "vue";
import type { VenueAvailability } from "../types/rental";
import { formatHourRangeLabel, getMinimumVenueStartHour } from "../utils/venueHours";

export interface VenueLookupPreview {
	date: string;
	isHoliday: boolean;
	slots: string[];
}

export function useVenueLookupPreview(options: {
	selectedLookupVenueId: Ref<string>;
	lookupDates: Ref<string[]>;
	earliestBorrowDate: Ref<string>;
	fetchVenueAvailabilityCached: (assetId: string, date: string) => Promise<VenueAvailability>;
}) {
	const venueLookupPreviews = ref<VenueLookupPreview[]>([]);
	const venueLookupPreviewLoading = ref(false);
	const venueLookupPreviewError = ref("");
	const venueLookupPreviewSeq = ref(0);

	const visibleVenueLookupPreviews = computed(() =>
		venueLookupPreviews.value.filter((preview) => preview.date >= options.earliestBorrowDate.value),
	);

	function getAvailableSlotLabels(availability: VenueAvailability): string[] {
		if (availability.closed) return [];
		const occupied = new Set<number>();
		for (const interval of availability.occupied) {
			const start = Number(interval.start.slice(0, 2));
			const end = Number(interval.end.slice(0, 2));
			for (let hour = start; hour < end; hour += 1) {
				occupied.add(hour);
			}
		}

		const slots: string[] = [];
		const openStart = Number(availability.openStart.slice(0, 2));
		const openEnd = Number(availability.openEnd.slice(0, 2));
		const minimumStartHour = getMinimumVenueStartHour(availability.date);
		const effectiveOpenStart = minimumStartHour == null ? openStart : Math.max(openStart, minimumStartHour);
		for (let hour = effectiveOpenStart; hour < openEnd; hour += 1) {
			if (!occupied.has(hour)) {
				slots.push(formatHourRangeLabel(hour));
			}
		}
		return slots;
	}

	async function loadVenueLookupPreviews() {
		venueLookupPreviews.value = [];
		venueLookupPreviewError.value = "";
		if (!options.selectedLookupVenueId.value || options.lookupDates.value.length === 0) return;

		const seq = ++venueLookupPreviewSeq.value;
		venueLookupPreviewLoading.value = true;
		try {
			const dates = [...options.lookupDates.value];
			const workerCount = Math.min(3, dates.length);
			let nextIndex = 0;
			await Promise.all(
				Array.from({ length: workerCount }, async () => {
					while (nextIndex < dates.length) {
						const date = dates[nextIndex];
						nextIndex += 1;
						if (seq !== venueLookupPreviewSeq.value) return;

						const availability = await options.fetchVenueAvailabilityCached(
							options.selectedLookupVenueId.value,
							date,
						);
						if (seq !== venueLookupPreviewSeq.value) return;
						const slots = getAvailableSlotLabels(availability);
						if (slots.length === 0) continue;
						const nextPreviews = [
							...venueLookupPreviews.value.filter((preview) => preview.date !== date),
							{ date, isHoliday: availability.isHoliday, slots },
						].sort((a, b) => a.date.localeCompare(b.date));
						venueLookupPreviews.value = nextPreviews;
					}
				}),
			);
			if (seq !== venueLookupPreviewSeq.value) return;
		} catch (error) {
			if (seq !== venueLookupPreviewSeq.value) return;
			venueLookupPreviewError.value = error instanceof Error ? error.message : "整理空間可借時段失敗";
		} finally {
			if (seq === venueLookupPreviewSeq.value) {
				venueLookupPreviewLoading.value = false;
			}
		}
	}

	const lookupCalendarSections = computed(() => {
		const byMonth = new Map<string, string[]>();
		for (const date of options.lookupDates.value) {
			const key = String(date || "").slice(0, 7);
			if (!key) continue;
			const list = byMonth.get(key) ?? [];
			list.push(date);
			byMonth.set(key, list);
		}
		return Array.from(byMonth.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, dates]) => {
				const [yearText, monthText] = key.split("-");
				const year = Number(yearText);
				const month = Number(monthText);
				const firstWeekday = new Date(year, month - 1, 1).getDay();
				const daysInMonth = new Date(year, month, 0).getDate();
				const availableDates = new Set(dates);
				const dayCells: Array<{ date: string; day: number; available: boolean } | null> = [];
				for (let i = 0; i < firstWeekday; i += 1) {
					dayCells.push(null);
				}
				for (let day = 1; day <= daysInMonth; day += 1) {
					const dateText = `${yearText}-${monthText}-${String(day).padStart(2, "0")}`;
					dayCells.push({
						date: dateText,
						day,
						available: availableDates.has(dateText) && dateText >= options.earliestBorrowDate.value,
					});
				}
				while (dayCells.length % 7 !== 0) {
					dayCells.push(null);
				}
				return {
					key,
					label: `${year}年${month}月`,
					dayCells,
				};
			});
	});

	return {
		venueLookupPreviews,
		venueLookupPreviewLoading,
		venueLookupPreviewError,
		visibleVenueLookupPreviews,
		lookupCalendarSections,
		loadVenueLookupPreviews,
	};
}
