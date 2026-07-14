<template>
	<div class="space-y-4 p-5">
		<p class="text-sm text-slate-500">請輸入 學號/員編 查詢租借中的項目，勾選欲歸還的項目送出申請。</p>
		<div class="flex gap-2">
			<input
				v-model.trim="returnSearchId"
				:disabled="returnSearchLoading"
				class="flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
				placeholder="請輸入學號/員編"
				@keyup.enter="emit('search')"
			/>
			<button
				type="button"
				:disabled="returnSearchLoading"
				class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
				@click="emit('search')"
			>
				{{ returnSearchLoading ? "查詢中..." : "查詢" }}
			</button>
		</div>

		<p v-if="returnSearchError" class="text-sm font-semibold text-red-700">{{ returnSearchError }}</p>

		<div v-if="returnResults.length > 0" class="space-y-3">
			<article
				v-for="record in returnResults"
				:key="record.id"
				class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
			>
				<input
					v-model="selectedReturnIds"
					type="checkbox"
					:value="record.id"
					:disabled="record.returnPending"
					class="mt-1 h-4 w-4 rounded border-slate-300 accent-slate-900"
				/>
				<div class="flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-semibold text-slate-900">{{ record.itemName }}</p>
						<span
							v-if="record.returnPending"
							class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
						>
							歸還申請待審核
						</span>
					</div>
					<p class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
						<span class="font-semibold text-amber-700">借用時間：</span>
						<span class="font-bold text-slate-950">{{ formatTemporalZh(record.borrowedAt) }}</span>
						<span class="mx-2 text-slate-400">|</span>
						<span class="font-semibold text-amber-700">應還時間：</span>
						<span class="font-bold text-slate-950">{{ formatTemporalZh(record.expectedReturnAt) }}</span>
					</p>
					<p v-if="isOverdue(record)" class="mt-0.5 text-xs font-semibold text-red-700">已逾借</p>
				</div>
			</article>

			<button
				type="button"
				:disabled="selectedReturnIds.length === 0 || submitting"
				class="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
				@click="emit('submit')"
			>
				送出歸還申請（{{ selectedReturnIds.length }} 項）
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { isOverdue, type ReturnSearchRecord } from "../../stores/rental";
import { formatTemporalZh } from "../../utils/date";

defineProps<{
	returnSearchLoading: boolean;
	returnSearchError: string;
	returnResults: ReturnSearchRecord[];
	submitting: boolean;
}>();

const emit = defineEmits<{
	search: [];
	submit: [];
}>();

const returnSearchId = defineModel<string>("returnSearchId", { required: true });
const selectedReturnIds = defineModel<string[]>("selectedReturnIds", { required: true });
</script>
