<template>
	<div v-if="authStore.staffRole === 'admin'" class="mt-2">
		<div v-if="editing" class="space-y-2">
			<p v-if="optionsLoading" class="text-xs text-slate-500">正在檢查可選時段…</p>
			<div v-else class="flex flex-wrap items-end gap-2">
				<label v-if="isVenue" class="space-y-1 text-xs text-slate-700">
					<span class="font-semibold">應結束時間</span>
					<select
						v-if="validVenueEndHours.length > 0"
						v-model="editValue"
						class="block rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring"
						:disabled="saving"
					>
						<option v-for="hour in validVenueEndHours" :key="hour" :value="hour">{{ hour }}</option>
					</select>
					<p v-else class="text-xs text-amber-700">此時段無可延長的結束時間（可能與其他借用衝突）。</p>
				</label>
				<label v-else class="space-y-1 text-xs text-slate-700">
					<span class="font-semibold">應歸還日期</span>
					<select
						v-if="validEquipmentReturnDates.length > 0"
						v-model="editValue"
						class="block rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring"
						:disabled="saving"
					>
						<option v-for="date in validEquipmentReturnDates" :key="date" :value="date">
							{{ formatDateZh(date) }}
						</option>
					</select>
					<p v-else class="text-xs text-amber-700">
						無可選歸還日（可能與其他借用或停用區間衝突）。
					</p>
				</label>
				<button
					type="button"
					class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="saving || optionsLoading || !canSave"
					@click="save"
				>
					{{ saving ? "儲存中..." : "儲存" }}
				</button>
				<button
					type="button"
					class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
					:disabled="saving"
					@click="cancel"
				>
					取消
				</button>
			</div>
			<p v-if="!optionsLoading && optionsHint" class="text-xs text-slate-500">{{ optionsHint }}</p>
		</div>
		<button
			v-else
			type="button"
			class="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
			@click="startEdit"
		>
			修改應還{{ isVenue ? "時間" : "日期" }}
		</button>
		<p v-if="errorMessage" class="mt-1 text-xs font-semibold text-red-700">{{ errorMessage }}</p>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";
import { useAssetsStore } from "../stores/assets";
import { useAuthStore } from "../stores/auth";
import { useRentalStore } from "../stores/rental";
import {
	computeValidEquipmentReturnDates,
	computeValidVenueEndHours,
	findConflictingBorrowRecord,
	formatConflictMessage,
} from "../utils/adminReturnDateOptions";
import { formatDateZh } from "../utils/date";
import type { BorrowRecord } from "../types/rental";

const props = defineProps<{
	record: BorrowRecord;
}>();

const emit = defineEmits<{
	saved: [];
}>();

const authStore = useAuthStore();
const assetsStore = useAssetsStore();
const rentalStore = useRentalStore();

const editing = ref(false);
const saving = ref(false);
const optionsLoading = ref(false);
const editValue = ref("");
const errorMessage = ref("");
const validEquipmentReturnDates = ref<string[]>([]);
const validVenueEndHours = ref<string[]>([]);

const isVenue = computed(() => {
	const assetId = props.record.assetIds[0];
	if (assetId) {
		const asset = assetsStore.assets.find((item) => item.id === assetId);
		if (asset) return asset.type === "venue";
	}
	return props.record.itemName.startsWith("空間:");
});

const canSave = computed(() => {
	if (isVenue.value) {
		return validVenueEndHours.value.length > 0 && Boolean(editValue.value);
	}
	return validEquipmentReturnDates.value.length > 0 && validEquipmentReturnDates.value.includes(editValue.value);
});

const optionsHint = computed(() => {
	if (isVenue.value) {
		if (validVenueEndHours.value.length === 0) return "";
		return `可選結束時間：${validVenueEndHours.value.join("、")}（已排除與他人借用衝突的時段）`;
	}
	if (validEquipmentReturnDates.value.length === 0) return "";
	return `共 ${validEquipmentReturnDates.value.length} 個可選日期（僅工作天，已排除週末、國定假日及借用衝突）`;
});

function getVenueEndTimeValue(expectedReturnAt: string): string {
	const match = / (\d{2}):(\d{2})$/.exec(expectedReturnAt);
	if (!match) return "23:00";
	return `${match[1]}:${match[2]}`;
}

function pickInitialEquipmentDate(dates: string[]): string {
	const current = props.record.expectedReturnAt.slice(0, 10);
	if (dates.includes(current)) return current;
	return dates[0] ?? current;
}

function pickInitialVenueHour(hours: string[]): string {
	const current = getVenueEndTimeValue(props.record.expectedReturnAt);
	if (hours.includes(current)) return current;
	return hours[0] ?? current;
}

async function loadEditOptions() {
	optionsLoading.value = true;
	validEquipmentReturnDates.value = [];
	validVenueEndHours.value = [];
	try {
		await Promise.all([rentalStore.loadRecords({ force: true }), assetsStore.loadAssets()]);

		if (isVenue.value) {
			const assetId = props.record.assetIds[0];
			const date = props.record.borrowedAt.slice(0, 10);
			if (!assetId || !date) return;
			const availability = await sheetsApi.fetchVenueAvailability(assetId, date);
			const hours = computeValidVenueEndHours(props.record, availability);
			validVenueEndHours.value = hours;
			editValue.value = pickInitialVenueHour(hours);
			return;
		}

		const assetId = props.record.assetIds[0];
		if (!assetId) return;

		const [blocked, assetPauses, holidays] = await Promise.all([
			sheetsApi.fetchAssetBlockedRanges(),
			sheetsApi.fetchAssetPauseRanges(),
			sheetsApi.fetchHolidays(),
		]);
		const holidayDates = new Set(holidays.map((holiday) => holiday.date));
		const pauseRanges = assetPauses
			.filter((pause) => pause.assetId === assetId)
			.map((pause) => ({ start: pause.startDate, end: pause.endDate }));
		const dates = computeValidEquipmentReturnDates(
			props.record,
			rentalStore.records,
			pauseRanges,
			blocked.globalPauseRanges ?? [],
			holidayDates,
		);
		validEquipmentReturnDates.value = dates;
		editValue.value = pickInitialEquipmentDate(dates);
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : "無法載入可選時段。";
	} finally {
		optionsLoading.value = false;
	}
}

async function startEdit() {
	errorMessage.value = "";
	editing.value = true;
	await loadEditOptions();
}

function cancel() {
	editing.value = false;
	editValue.value = "";
	errorMessage.value = "";
	validEquipmentReturnDates.value = [];
	validVenueEndHours.value = [];
}

function buildExpectedReturnAt(): string {
	if (isVenue.value) {
		const hour = editValue.value.trim();
		if (!validVenueEndHours.value.includes(hour)) {
			throw new Error("所選結束時間與其他借用衝突，請改選其他時間。");
		}
		return `${props.record.borrowedAt.slice(0, 10)} ${hour}`;
	}
	const date = editValue.value.trim();
	if (!validEquipmentReturnDates.value.includes(date)) {
		const conflict = findConflictingBorrowRecord(props.record, date, rentalStore.records);
		if (conflict) {
			throw new Error(formatConflictMessage(conflict));
		}
		throw new Error("所選歸還日期與其他借用或停用區間衝突，請改選其他日期。");
	}
	return date;
}

async function save() {
	errorMessage.value = "";
	saving.value = true;
	try {
		const expectedReturnAt = buildExpectedReturnAt();
		await rentalStore.updateRecordExpectedReturnAt({
			operatorAccount: authStore.staffAccount,
			recordId: props.record.id,
			expectedReturnAt,
		});
		cancel();
		emit("saved");
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : "更新失敗。";
	} finally {
		saving.value = false;
	}
}
</script>
