<template>
	<div
		v-if="visible"
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="確認借用申請"
		@click.self="emit('cancel')"
	>
		<section class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
			<div class="border-b border-slate-200 px-5 py-4">
				<h3 class="text-lg font-bold text-slate-900">請確認以下資料，送出後將進入審核階段。</h3>
			</div>
			<div class="space-y-4 overflow-y-auto px-5 py-4">
				<section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
					<div class="mb-2 flex items-center justify-between">
						<h4 class="text-sm font-bold text-slate-800">借用內容</h4>
					</div>
					<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-[120px_1fr]">
						<p class="font-semibold text-slate-500">借用項目</p>
						<p>
							<span class="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
								{{ summary.selectedAssetName }}
							</span>
						</p>
						<p class="font-semibold text-slate-500">借用日期</p>
						<p>
							<span class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
								{{ formatDateZh(summary.form.borrowedAt) }}
							</span>
						</p>
						<template v-if="summary.isVenueSelected">
							<p class="font-semibold text-slate-500">借用時段</p>
							<p>
								<span class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
									{{ summary.selectedVenueSlotLabels.join("、") }}
								</span>
							</p>
							<p class="font-semibold text-slate-500">借用時數</p>
							<p class="font-semibold text-slate-900">{{ summary.venueDurationHours }} 小時</p>
						</template>
						<template v-else>
							<p class="font-semibold text-slate-500">歸還日期</p>
							<p>
								<span class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
									{{ formatDateZh(summary.form.expectedReturnAt) }}
								</span>
							</p>
							<p class="font-semibold text-slate-500">借用天數</p>
							<p class="font-semibold text-slate-900">{{ summary.borrowDurationDays }} 天（含借用當日）</p>
						</template>
					</div>
				</section>

				<section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
					<div class="mb-2 flex items-center justify-between">
						<h4 class="text-sm font-bold text-slate-800">借用人資訊</h4>
					</div>
					<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-[120px_1fr]">
						<p class="font-semibold text-slate-500">姓名 / 學號</p>
						<p class="font-semibold text-slate-900">{{ summary.form.studentName }} / {{ summary.form.studentId }}</p>
						<p class="font-semibold text-slate-500">聯絡電話</p>
						<p class="font-semibold text-slate-900">{{ summary.form.studentPhone }}</p>
						<p class="font-semibold text-slate-500">電子郵件</p>
						<p class="font-semibold text-slate-900">{{ summary.form.studentEmail }}</p>
					</div>
				</section>

				<section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
					<div class="mb-2 flex items-center justify-between">
						<h4 class="text-sm font-bold text-slate-800">活動資訊</h4>
					</div>
					<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-[120px_1fr]">
						<p class="font-semibold text-slate-500">活動名稱</p>
						<p class="font-semibold text-slate-900">{{ summary.form.activityName }}</p>
						<p class="font-semibold text-slate-500">借用團體</p>
						<p class="font-semibold text-slate-900">{{ summary.form.borrowerGroup }}</p>
						<p class="font-semibold text-slate-500">負責導師</p>
						<p class="font-semibold text-slate-900">{{ summary.form.mentorName || "無" }}</p>
					</div>
				</section>
			</div>

			<div class="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
				<button
					type="button"
					class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
					:disabled="submitting"
					@click="emit('cancel')"
				>
					返回修改
				</button>
				<button
					type="button"
					class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="submitting"
					@click="emit('confirm')"
				>
					確認並送出申請
				</button>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { formatDateZh } from "../../utils/date";
import type { BorrowConfirmSummary } from "../../types/borrowForm";

defineProps<{
	visible: boolean;
	submitting: boolean;
	summary: BorrowConfirmSummary;
}>();

const emit = defineEmits<{
	cancel: [];
	confirm: [];
}>();
</script>
