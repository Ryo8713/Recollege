<template>
	<div class="space-y-4">
		<p v-if="reviewedApplications.length === 0" class="text-sm text-slate-500">目前沒有已審核紀錄。</p>

		<div
			v-if="reviewedApplicationMonthSections.length > 0"
			class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
		>
			<label class="block space-y-1 text-sm">
				<span class="font-bold text-slate-800">選擇月份</span>
				<select
					v-model="selectedReviewedMonthKey"
					class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 outline-none ring-blue-500 focus:ring md:w-64"
				>
					<option
						v-for="section in reviewedApplicationMonthSections"
						:key="section.key"
						:value="section.key"
					>
						{{ section.label }}
					</option>
				</select>
			</label>
		</div>

		<section
			v-if="selectedReviewedMonthSection"
			class="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm"
		>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h4 class="font-bold text-slate-900">{{ selectedReviewedMonthSection.label }}</h4>
				<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
					{{ selectedReviewedMonthSection.apps.length }} 筆
				</span>
			</div>

			<details
				v-for="app in selectedReviewedMonthSection.apps"
				:key="app.id"
				class="reviewed-card group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
				:class="getReviewedCardBorderClass(app)"
			>
				<summary class="cursor-pointer list-none p-4 transition hover:bg-slate-50/80">
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1 space-y-2.5">
							<div class="flex flex-wrap items-center gap-2">
								<span
									class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
									:class="app.type === '借用申請' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'"
								>
									{{ app.type }}
								</span>
								<span
									class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
									:class="app.status === '已核准' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'"
								>
									{{ app.status }}
								</span>
							</div>
							<p class="text-base font-bold tracking-tight text-slate-900">{{ formatBorrowItemLabel(app) }}</p>
							<p class="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
								{{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}
							</p>
							<p class="text-sm font-semibold text-slate-800">
								{{ app.studentName }}
								<span class="text-slate-500">·</span>
								{{ app.studentId }}
							</p>
						</div>
						<div class="flex shrink-0 flex-col items-end gap-2">
							<span
								class="reviewed-card-chevron flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:border-slate-300 group-hover:text-slate-900"
								aria-hidden="true"
							>
								⌄
							</span>
							<div class="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs text-white shadow-sm">
								<p class="font-medium text-slate-300">審核人</p>
								<p class="mt-0.5 font-bold">{{ app.reviewedBy || "未記錄" }}</p>
								<p class="mt-1 text-[11px] font-medium text-slate-300">
									{{ formatTemporalZh(app.reviewedAt || "") || "未記錄" }}
								</p>
							</div>
						</div>
					</div>
				</summary>

				<dl class="grid grid-cols-1 gap-2 border-t border-slate-200 bg-slate-50/60 p-4 text-sm md:grid-cols-2">
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">借用項目</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ formatBorrowItemLabel(app) }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">申請類型 / 狀態</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.type }} / {{ app.status }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">借用時間</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">借用人</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.studentId }} / {{ app.studentName }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">聯絡電話</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.studentPhone }} / {{ app.studentEmail }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">活動 / 團體</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.activityName }} / {{ app.borrowerGroup }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">負責導師</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.mentorName || "無" }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">申請日期</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ formatTemporalZh(app.createdAt) }}</dd>
					</div>
					<div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
						<dt class="text-xs font-bold text-slate-700">審核資訊</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.reviewedBy || "未記錄" }} / {{ formatTemporalZh(app.reviewedAt || "") || "未記錄" }}</dd>
					</div>
					<div v-if="app.status === '已駁回'" class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100 md:col-span-2">
						<dt class="text-xs font-bold text-slate-700">駁回原因</dt>
						<dd class="mt-0.5 font-bold text-slate-950">{{ app.rejectionReason || "未填寫" }}</dd>
					</div>
				</dl>
			</details>
		</section>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRentalStore } from "../../stores/rental";
import type { Application } from "../../types/rental";
import { formatTemporalZh } from "../../utils/date";
import {
	datePart,
	formatBorrowItemLabel,
	formatBorrowPeriodZh,
	formatMonthLabel,
} from "../../utils/staffDisplay";

const rentalStore = useRentalStore();
const selectedReviewedMonthKey = ref("");

const reviewedApplications = computed(() =>
	rentalStore.applications
		.filter((a) => a.status !== "待審核")
		.sort((a, b) => {
			const reviewedDiff = String(b.reviewedAt || "").localeCompare(String(a.reviewedAt || ""));
			if (reviewedDiff !== 0) return reviewedDiff;
			return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
		}),
);

const reviewedApplicationMonthSections = computed(() => {
	const byMonth = new Map<string, Application[]>();
	for (const app of reviewedApplications.value) {
		const sourceDate = datePart(app.reviewedAt || app.createdAt || app.borrowedAt);
		const key = /^\d{4}-\d{2}/.test(sourceDate) ? sourceDate.slice(0, 7) : "未記錄";
		const apps = byMonth.get(key) ?? [];
		apps.push(app);
		byMonth.set(key, apps);
	}
	return Array.from(byMonth.entries())
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([key, apps]) => ({
			key,
			label: formatMonthLabel(key),
			apps,
		}));
});

const selectedReviewedMonthSection = computed(
	() =>
		reviewedApplicationMonthSections.value.find(
			(section) => section.key === selectedReviewedMonthKey.value,
		) ??
		reviewedApplicationMonthSections.value[0] ??
		null,
);

watch(
	reviewedApplicationMonthSections,
	(sections) => {
		if (sections.length === 0) {
			selectedReviewedMonthKey.value = "";
			return;
		}
		if (!sections.some((section) => section.key === selectedReviewedMonthKey.value)) {
			selectedReviewedMonthKey.value = sections[0].key;
		}
	},
	{ immediate: true },
);

function getReviewedCardBorderClass(app: Application): string {
	if (app.status === "已駁回") return "border-red-200 border-l-4 border-l-red-500";
	if (app.type === "歸還申請") return "border-emerald-200 border-l-4 border-l-emerald-500";
	return "border-blue-200 border-l-4 border-l-blue-500";
}
</script>

<style scoped>
.reviewed-card > summary::-webkit-details-marker {
	display: none;
}

.reviewed-card-chevron {
	font-size: 1.125rem;
	line-height: 1;
}

.reviewed-card[open] .reviewed-card-chevron {
	transform: rotate(180deg);
}
</style>
