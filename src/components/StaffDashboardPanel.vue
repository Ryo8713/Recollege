<template>
	<div class="space-y-4">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<article class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
				<p class="text-sm text-slate-500">今日待處理申請數</p>
				<p class="mt-1 text-2xl font-bold text-slate-900">{{ todayPendingApplicationsCount }}</p>
			</article>
			<article class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
				<p class="text-sm text-amber-700">今日到期未還數</p>
				<p class="mt-1 text-2xl font-bold text-amber-700">{{ dueTodayUnreturnedCount }}</p>
			</article>
			<article class="rounded-2xl border border-red-200 bg-red-50 p-4">
				<p class="text-sm text-red-700">逾期總數</p>
				<p class="mt-1 text-2xl font-bold text-red-700">{{ overdueTotalCount }}</p>
			</article>
		</div>

		<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
			<h3 class="mb-3 font-semibold text-slate-900">近期風險</h3>
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<section class="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
					<h4 class="text-sm font-semibold text-blue-900">24 小時內到期</h4>
					<p v-if="dueWithin24HoursRecords.length === 0" class="text-xs text-slate-500">目前無項目。</p>
					<article
						v-for="record in dueWithin24HoursRecords"
						:key="`due24-${record.id}`"
						class="rounded-lg border border-blue-100 bg-white p-2"
					>
						<p class="text-sm font-semibold text-slate-900">{{ formatBorrowItemLabel(record) }}</p>
						<p class="text-xs text-slate-600">{{ record.studentId }} / {{ record.studentName }}</p>
						<p class="text-xs font-semibold text-blue-800">應還：{{ formatTemporalZh(record.expectedReturnAt) }}</p>
					</article>
				</section>
				<section class="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
					<h4 class="text-sm font-semibold text-amber-900">待審核歸還申請</h4>
					<p v-if="pendingReturnApplicationsForRisk.length === 0" class="text-xs text-slate-500">目前無項目。</p>
					<article
						v-for="app in pendingReturnApplicationsForRisk"
						:key="`pending-return-${app.id}`"
						class="rounded-lg border border-amber-100 bg-white p-2"
					>
						<p class="text-sm font-semibold text-slate-900">{{ formatBorrowItemLabel(app) }}</p>
						<p class="text-xs text-slate-600">{{ app.studentId }} / {{ app.studentName }}</p>
						<p class="text-xs font-semibold text-amber-800">申請建立：{{ formatTemporalZh(app.createdAt) }}</p>
					</article>
				</section>
			</div>
		</div>

		<div class="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
			<h3 class="mb-3 font-semibold text-red-800">已逾期清單（依逾期天數排序）</h3>
			<p v-if="overdueRecordsSortedByDays.length === 0" class="text-sm text-red-700">目前無逾期項目。</p>
			<article
				v-for="record in overdueRecordsSortedByDays"
				:key="`overdue-${record.id}`"
				class="mb-2 rounded-xl border border-red-100 bg-white p-3"
			>
				<p class="font-semibold text-slate-900">{{ formatBorrowItemLabel(record) }}</p>
				<p class="text-sm text-slate-600">{{ record.studentId }} / {{ record.studentName }}</p>
				<p class="text-sm font-semibold text-red-700">
					應還：{{ formatTemporalZh(record.expectedReturnAt) }} ｜ 逾期 {{ getOverdueDays(record.expectedReturnAt) }} 天
				</p>
				<RecordExpectedReturnEditor :record="record" />
			</article>
		</div>

		<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 class="font-semibold text-slate-900">進行中借用紀錄</h3>
					<p class="mt-0.5 text-xs text-slate-500">含待生效與租借中；職員可於核准後、歸還前調整應歸還日期。</p>
				</div>
				<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
					共 {{ rentalStore.inProgressRecords.length }} 筆
				</span>
			</div>
			<p v-if="rentalStore.inProgressRecords.length === 0" class="text-sm text-slate-500">目前無進行中借用紀錄。</p>
			<article
				v-for="record in rentalStore.inProgressRecords"
				:key="record.id"
				class="mb-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
			>
				<div class="flex flex-wrap items-center gap-2">
					<p class="font-medium text-slate-900">{{ formatBorrowItemLabel(record) }}</p>
					<span
						v-if="record.status === '待生效'"
						class="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800"
					>
						待生效
					</span>
					<span
						v-else-if="rentalStore.isOverdue(record)"
						class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800"
					>
						已逾借
					</span>
					<span
						v-else
						class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
					>
						租借中
					</span>
				</div>
				<p class="text-sm text-slate-600">{{ record.studentId }} / {{ record.studentName }}</p>
				<p class="text-sm text-slate-500">借用：{{ formatTemporalZh(record.borrowedAt) }} ｜ 應還：{{ formatTemporalZh(record.expectedReturnAt) }}</p>
				<RecordExpectedReturnEditor :record="record" />
			</article>
		</div>

		<div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h3 class="font-semibold text-slate-900">新增職員帳號</h3>
				<span class="text-xs font-semibold text-slate-500">目前登入：{{ authStore.staffName || authStore.staffAccount }}</span>
			</div>
			<form class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4" @submit.prevent="handleCreateStaffAccount">
				<input
					v-model.trim="staffAccountForm.account"
					class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
					placeholder="新職員帳號"
					maxlength="32"
					:disabled="staffAccountSubmitting"
				/>
				<input
					v-model.trim="staffAccountForm.name"
					class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
					placeholder="新職員姓名"
					maxlength="32"
					:disabled="staffAccountSubmitting"
				/>
				<input
					v-model="staffAccountForm.password"
					type="password"
					class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
					placeholder="新職員密碼"
					maxlength="32"
					:disabled="staffAccountSubmitting"
				/>
				<button
					type="submit"
					class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
					:disabled="staffAccountSubmitting"
				>
					{{ staffAccountSubmitting ? "新增中..." : "新增職員帳號" }}
				</button>
			</form>
			<p v-if="staffAccountError" class="mt-2 text-sm font-semibold text-red-700">{{ staffAccountError }}</p>
			<p v-if="staffAccountSuccess" class="mt-2 text-sm font-semibold text-emerald-700">{{ staffAccountSuccess }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import RecordExpectedReturnEditor from "./RecordExpectedReturnEditor.vue";
import { useAuthStore } from "../stores/auth";
import { useRentalStore } from "../stores/rental";
import { formatTemporalZh, getTodayText } from "../utils/date";
import {
	datePart,
	diffDaysFromToday,
	formatBorrowItemLabel,
	getOverdueDays,
} from "../utils/staffDisplay";

const rentalStore = useRentalStore();
const authStore = useAuthStore();

const staffAccountSubmitting = ref(false);
const staffAccountError = ref("");
const staffAccountSuccess = ref("");
const staffAccountForm = reactive({
	account: "",
	name: "",
	password: "",
});

const todayText = computed(() => getTodayText());

const todayPendingApplicationsCount = computed(() => rentalStore.pendingApplications.length);

const dueTodayUnreturnedCount = computed(
	() =>
		rentalStore.activeRecords.filter(
			(record) => datePart(record.expectedReturnAt) === todayText.value,
		).length,
);

const overdueTotalCount = computed(() => rentalStore.overdueRecords.length);

const dueWithin24HoursRecords = computed(() =>
	rentalStore.activeRecords
		.filter((record) => {
			const days = diffDaysFromToday(record.expectedReturnAt, todayText.value);
			return days >= 0 && days <= 1;
		})
		.sort((a, b) => a.expectedReturnAt.localeCompare(b.expectedReturnAt)),
);

const overdueRecordsSortedByDays = computed(() =>
	[...rentalStore.overdueRecords].sort((a, b) => {
		const overdueDayDiff =
			getOverdueDays(b.expectedReturnAt, todayText.value) -
			getOverdueDays(a.expectedReturnAt, todayText.value);
		if (overdueDayDiff !== 0) return overdueDayDiff;
		return a.expectedReturnAt.localeCompare(b.expectedReturnAt);
	}),
);

const pendingReturnApplicationsForRisk = computed(() =>
	rentalStore.pendingApplications
		.filter((app) => app.type === "歸還申請")
		.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
);

async function handleCreateStaffAccount() {
	staffAccountError.value = "";
	staffAccountSuccess.value = "";
	if (!staffAccountForm.account || !staffAccountForm.name || !staffAccountForm.password) {
		staffAccountError.value = "請完整填寫新帳號、姓名與新密碼。";
		return;
	}
	staffAccountSubmitting.value = true;
	try {
		await authStore.createStaffAccount({
			account: staffAccountForm.account.trim(),
			name: staffAccountForm.name.trim(),
			password: staffAccountForm.password,
		});
		staffAccountSuccess.value = `已成功新增職員帳號：${staffAccountForm.name.trim()}（${staffAccountForm.account.trim()}）`;
		staffAccountForm.account = "";
		staffAccountForm.name = "";
		staffAccountForm.password = "";
	} catch (error) {
		staffAccountError.value = error instanceof Error ? error.message : "新增職員帳號失敗。";
	} finally {
		staffAccountSubmitting.value = false;
	}
}
</script>
