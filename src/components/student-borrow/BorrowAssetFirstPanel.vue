<template>
	<div class="space-y-3 border-t border-slate-200 pt-4">
		<p class="text-sm text-slate-600">可查詢未來 30 天內可借用日期。</p>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">空間</span>
				<select
					:value="selection.selectedLookupVenueId"
					class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
					@change="onVenueChange"
				>
					<option value="">請選擇空間</option>
					<option v-for="asset in options.selectableVenueAssets" :key="asset.id" :value="asset.id">
						{{ asset.name }}
					</option>
				</select>
			</label>
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">設備</span>
				<select
					:value="selection.selectedLookupEquipmentId"
					class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
					@change="onEquipmentChange"
				>
					<option value="">請選擇設備</option>
					<option v-for="asset in options.selectableEquipmentAssets" :key="asset.id" :value="asset.id">
						{{ asset.name }}
					</option>
				</select>
			</label>
		</div>
		<p v-if="lookupResult.lookupError" class="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{{ lookupResult.lookupError }}</p>
		<p v-else-if="lookupResult.lookupLoading" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">查詢中...</p>
		<div v-else-if="lookupResult.lookupDates.length > 0" class="space-y-4">
			<div v-if="selection.isLookupVenueSelected" class="space-y-3">
				<p class="text-sm text-slate-600">以下列出未來 30 天內可借用日期與時段，點選日期後可繼續填單。</p>
				<p v-if="lookupResult.venueLookupPreviewLoading" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
					正在整理可借時段...
				</p>
				<p v-else-if="lookupResult.venueLookupPreviewError" class="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
					{{ lookupResult.venueLookupPreviewError }}
				</p>
				<section
					v-for="preview in lookupResult.visibleVenueLookupPreviews"
					:key="preview.date"
					class="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"
				>
					<div class="min-w-0 flex-1">
						<h4 class="text-sm font-bold text-blue-950">{{ formatDateZhWithWeekday(preview.date) }}</h4>
						<p class="text-xs font-semibold text-blue-700">{{ preview.isHoliday ? "假日" : "平日" }}可借時段</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<span
								v-for="slot in preview.slots"
								:key="`${preview.date}-${slot}`"
								class="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800"
							>
								{{ slot }}
							</span>
						</div>
					</div>
					<button
						type="button"
						class="shrink-0 self-center rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600"
						@click="emit('apply-date', preview.date)"
					>
						選擇
					</button>
				</section>
			</div>
			<div v-else class="space-y-4">
				<p class="text-sm text-slate-600">點選日期後，頁面會切換至「依日期查詢可借項目」繼續填單。</p>
				<section
					v-for="section in lookupResult.lookupCalendarSections"
					:key="section.key"
					class="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
				>
					<h4 class="text-sm font-semibold text-slate-800">{{ section.label }}</h4>
					<div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
						<span v-for="weekday in weekdayLabels" :key="`${section.key}-${weekday}`">{{ weekday }}</span>
					</div>
					<div class="grid grid-cols-7 gap-1">
						<template v-for="(cell, index) in section.dayCells" :key="`${section.key}-${index}`">
							<div v-if="!cell" class="h-10 rounded-lg" aria-hidden="true"></div>
							<button
								v-else
								type="button"
								class="flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition"
								:class="
									cell.available
										? selection.selectedBorrowedAt === cell.date
											? 'border-blue-700 bg-blue-700 text-white'
											: 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50'
										: 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
								"
								:disabled="!cell.available"
								:title="formatDateZhWithWeekday(cell.date)"
								@click="emit('apply-date', cell.date)"
							>
								{{ cell.day }}
							</button>
						</template>
					</div>
				</section>
			</div>
		</div>
		<p v-else-if="selection.selectedLookupAssetId" class="text-sm text-slate-500">目前不開放借用。</p>
	</div>
</template>

<script setup lang="ts">
import { formatDateZhWithWeekday, WEEKDAY_LABELS } from "../../utils/date";
import type {
	AssetFirstLookupResult,
	AssetFirstOptions,
	AssetFirstSelection,
} from "../../composables/useAssetFirstLookupPanel";

defineProps<{
	options: AssetFirstOptions;
	selection: AssetFirstSelection;
	lookupResult: AssetFirstLookupResult;
}>();

const emit = defineEmits<{
	"update:selectedLookupVenueId": [value: string];
	"update:selectedLookupEquipmentId": [value: string];
	"apply-date": [date: string];
}>();

const weekdayLabels = WEEKDAY_LABELS;

function onVenueChange(event: Event) {
	const value = (event.target as HTMLSelectElement).value;
	emit("update:selectedLookupVenueId", value);
}

function onEquipmentChange(event: Event) {
	const value = (event.target as HTMLSelectElement).value;
	emit("update:selectedLookupEquipmentId", value);
}
</script>
