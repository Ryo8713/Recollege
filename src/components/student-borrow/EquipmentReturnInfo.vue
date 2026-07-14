<template>
	<section class="border-b border-slate-200 pb-4">
		<h3 class="text-sm font-semibold text-slate-800">【步驟三】應歸還日期</h3>
		<p class="mt-1 text-xs text-slate-500">
			設備須於借用日的下一個工作天前歸還（週末與國定假日不可借用或歸還），系統已自動為您計算應歸還日期。
		</p>
		<p v-if="!selectedAssetId" class="mt-2 text-sm text-slate-500">請先完成步驟 2。</p>
		<p v-else-if="returnDateLoading" class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
			正在確認可歸還日期...
		</p>
		<p v-else-if="returnDateError" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
			{{ returnDateError }}
		</p>
		<template v-else-if="equipmentReturnDate">
			<div class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
				<p class="text-xs font-semibold text-emerald-700">應歸還日期</p>
				<p class="mt-1 text-lg font-bold text-emerald-900">{{ formatDateZh(equipmentReturnDate) }}</p>
			</div>
		</template>
		<p v-else-if="hasNoAvailableReturnDate" class="mt-2 text-sm text-slate-500">
			此品項在所選借用日期下無可歸還日期，請改選借用日期或項目。
		</p>
		<p v-else-if="selectedAssetId" class="mt-2 text-sm text-slate-500">請先選擇借用日期。</p>
	</section>
</template>

<script setup lang="ts">
import { formatDateZh } from "../../utils/date";
import type { DateFirstEquipmentReturn } from "../../types/borrowForm";

defineProps<DateFirstEquipmentReturn>();
</script>
