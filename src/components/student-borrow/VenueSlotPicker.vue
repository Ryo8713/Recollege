<template>
	<section class="border-b border-slate-200 pb-4">
		<h3 class="text-sm font-semibold text-slate-800">【步驟三】選擇借用時段</h3>
		<p class="mt-1 text-xs text-slate-500">空間僅能借用連續時段，所選時段必須前後相連。</p>
		<p v-if="venueAvailabilityLoading" class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
			正在讀取可借時段...
		</p>
		<p v-else-if="venueAvailabilityError" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
			{{ venueAvailabilityError }}
		</p>
		<div v-else-if="venueAvailability && !venueAvailability.closed" class="mt-2 space-y-3">
			<p class="text-xs font-semibold text-slate-500">
				{{ venueAvailability.isHoliday ? "假日" : "平日" }}可借用時段:
				{{ venueAvailability.openStart }}–{{ venueAvailability.openEnd }}
			</p>
			<div>
				<p class="text-xs font-semibold text-slate-500">可借時段</p>
				<div v-if="venueStartHours.length > 0" class="mt-1 flex flex-wrap gap-2">
					<button
						v-for="hour in venueStartHours"
						:key="`slot-${hour}`"
						type="button"
						class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
						:class="
							selectedVenueSlotSet.has(hour)
								? 'border-emerald-700 bg-emerald-700 text-white'
								: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
						"
						@click="emit('toggle-slot', hour)"
					>
						{{ formatHourRangeLabel(hour) }}
					</button>
				</div>
				<p v-else class="mt-1 text-sm text-slate-500">此日已無可借時段，請改選日期或項目。</p>
			</div>
			<p v-if="venueDurationHours > 0" class="text-sm font-semibold text-slate-900">
				已選 {{ venueDurationHours }} 小時：{{ selectedVenueSlotLabels.join("、") }}
			</p>
		</div>
		<p v-else-if="selectedAssetId" class="mt-2 text-sm text-slate-500">此空間於所選日期不開放借用，請改選日期或項目。</p>
	</section>
</template>

<script setup lang="ts">
import { formatHourRangeLabel } from "../../utils/venueHours";
import type { DateFirstVenueSlots } from "../../types/borrowForm";

defineProps<DateFirstVenueSlots>();

const emit = defineEmits<{
	"toggle-slot": [hour: number];
}>();
</script>
