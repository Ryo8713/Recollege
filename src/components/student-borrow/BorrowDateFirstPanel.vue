<template>
	<div class="space-y-4">
		<section class="border-b border-slate-200 pb-4">
			<h3 class="text-sm font-semibold text-slate-800">【步驟一】選擇欲開始借用之日期</h3>
			<p class="mt-1 text-xs text-slate-500">
				申請需約 {{ BORROW_LEAD_WORKING_DAYS }} 個工作天作業時間（申請當日不計入，已排除週末與國定假日），最早可借用日期為
				<span class="font-semibold text-slate-700">{{ formatDateZh(dateRules.earliestBorrowDate) }}</span>。設備借用與歸還日須為工作天（週末與國定假日不可）。
			</p>
			<div class="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
				<input
					v-model="form.borrowedAt"
					type="date"
					:min="dateRules.earliestBorrowDate"
					class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring"
				/>
			</div>
		</section>

		<section class="border-b border-slate-200 pb-4">
			<h3 class="text-sm font-semibold text-slate-800">【步驟二】選擇當日可借用項目（空間或設備擇一）</h3>
			<p class="mt-1 text-xs text-slate-500">單次借用僅能選擇一個項目。</p>
			<p v-if="availability.error" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
				{{ availability.error }}
			</p>
			<p v-else-if="availability.loading" class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
				正在更新指定日期的可借項目...
			</p>
			<div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
				<div class="space-y-2">
					<p class="text-xs font-semibold text-slate-500">空間</p>
					<div v-if="availability.availableVenues.length === 0" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">無可借空間</div>
					<div v-else class="flex flex-wrap gap-2">
						<button
							v-for="venue in availability.availableVenues"
							:key="venue.id"
							type="button"
							class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
							:class="
								availability.selectedAssetId === venue.id
									? 'border-blue-900 bg-blue-900 text-white'
									: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
							"
							@click="emit('select-asset', venue.id, 'venue')"
						>
							{{ venue.name }}
						</button>
					</div>
				</div>
				<div class="space-y-2">
					<p class="text-xs font-semibold text-slate-500">設備</p>
					<div v-if="availability.availableEquipments.length === 0" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">無可借設備</div>
					<div v-else class="flex flex-wrap gap-2">
						<button
							v-for="eq in availability.availableEquipments"
							:key="eq.id"
							type="button"
							class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
							:class="
								availability.selectedAssetId === eq.id
									? 'border-blue-900 bg-blue-900 text-white'
									: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
							"
							@click="emit('select-asset', eq.id, 'equipment')"
						>
							{{ eq.name }}
						</button>
					</div>
				</div>
			</div>
		</section>

		<VenueSlotPicker
			v-if="isVenueSelected"
			v-bind="venueSlots"
			@toggle-slot="emit('toggle-slot', $event)"
		/>
		<EquipmentReturnInfo v-else v-bind="equipmentReturn" />

		<BorrowerInfoForm
			:form="form"
			:is-student-borrow-blocked="submitState.isStudentBorrowBlocked"
			:submit-disabled="submitState.submitDisabled"
			@submit="emit('submit')"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AssetType } from "../../types/rental";
import type {
	BorrowFormState,
	DateFirstAvailability,
	DateFirstDateRules,
	DateFirstEquipmentReturn,
	DateFirstSubmitState,
	DateFirstVenueSlots,
} from "../../types/borrowForm";
import { BORROW_LEAD_WORKING_DAYS } from "../../utils/borrowRestrictions";
import { formatDateZh } from "../../utils/date";
import BorrowerInfoForm from "./BorrowerInfoForm.vue";
import EquipmentReturnInfo from "./EquipmentReturnInfo.vue";
import VenueSlotPicker from "./VenueSlotPicker.vue";

const props = defineProps<{
	form: BorrowFormState;
	dateRules: DateFirstDateRules;
	availability: DateFirstAvailability;
	venueSlots: DateFirstVenueSlots;
	equipmentReturn: DateFirstEquipmentReturn;
	submitState: DateFirstSubmitState;
}>();

const emit = defineEmits<{
	"select-asset": [assetId: string, type: AssetType];
	"toggle-slot": [hour: number];
	submit: [];
}>();

const isVenueSelected = computed(() => props.availability.selectedAssetType === "venue");
</script>
