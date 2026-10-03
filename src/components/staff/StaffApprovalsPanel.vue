<template>
	<div class="space-y-3">
		<p
			v-if="rentalStore.reviewError"
			class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
		>
			{{ rentalStore.reviewError }}
		</p>
		<p v-if="rentalStore.pendingApplications.length === 0" class="text-sm text-slate-500">
			目前沒有待審核申請。
		</p>
		<div
			v-if="rentalStore.pendingApplications.length > 0"
			class="flex flex-wrap gap-2"
		>
			<button
				v-for="tab in approvalTabs"
				:key="tab.key"
				type="button"
				class="rounded-full border px-4 py-2 text-sm font-semibold transition"
				:class="
					approvalFilter === tab.key
						? 'border-slate-900 bg-slate-900 text-white'
						: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
				"
				@click="approvalFilter = tab.key"
			>
				{{ tab.title }}（{{ tab.applications.length }}）
			</button>
		</div>
		<div
			v-if="rentalStore.pendingApplications.length > 0"
			class="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2"
		>
			<label class="space-y-1 text-xs font-semibold text-slate-600">
				<span>類型篩選</span>
				<select
					v-model="assetFilter"
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none ring-blue-500 focus:ring"
				>
					<option value="all">全部（空間＋設備）</option>
					<option value="venue">僅顯示空間</option>
					<option value="equipment">僅顯示設備</option>
				</select>
			</label>
			<label class="space-y-1 text-xs font-semibold text-slate-600">
				<span>開始借用時間排序</span>
				<select
					v-model="borrowDateSort"
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none ring-blue-500 focus:ring"
				>
					<option value="borrowedAtAsc">開始日近到遠</option>
					<option value="borrowedAtDesc">開始日遠到近</option>
				</select>
			</label>
		</div>

		<p
			v-if="rentalStore.pendingApplications.length > 0 && activeApplications.length === 0"
			class="text-sm text-slate-500"
		>
			{{ activePanel.emptyText }}
		</p>

		<section v-if="activeApplications.length > 0" class="space-y-2">
			<h3 :class="activePanel.headingClass">
				{{ activePanel.title }}（{{ activeApplications.length }}）
			</h3>
			<article
				v-for="app in activeApplications"
				:key="app.id"
				:class="activePanel.articleClass"
			>
				<div class="space-y-3">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="space-y-1">
							<div class="flex flex-wrap items-center gap-2">
								<span :class="activePanel.badgeClass">{{ activePanel.title }}</span>
								<span class="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{{ getApplicationAssetTypeLabel(app) }}</span>
							</div>
							<p class="text-base font-bold tracking-tight text-slate-900">{{ app.itemName }}</p>
						</div>
						<p class="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
							{{ formatTemporalZh(app.borrowedAt) }} 開始
						</p>
					</div>
					<dl class="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
						<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
							<dt class="text-xs font-semibold text-slate-500">申請人</dt>
							<dd class="mt-0.5 font-semibold text-slate-900">{{ app.studentName }}（{{ app.studentId }}）</dd>
						</div>
						<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
							<dt class="text-xs font-semibold text-slate-500">聯絡電話</dt>
							<dd class="mt-0.5 font-semibold text-slate-900">{{ app.studentPhone }}</dd>
						</div>
						<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
							<dt class="text-xs font-semibold text-slate-500">借用時段</dt>
							<dd class="mt-0.5 font-semibold text-slate-900">{{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}</dd>
						</div>
						<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
							<dt class="text-xs font-semibold text-slate-500">活動 / 團體</dt>
							<dd class="mt-0.5 font-semibold text-slate-900">{{ app.activityName }} / {{ app.borrowerGroup }}</dd>
						</div>
						<div v-if="app.mentorName" class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
							<dt class="text-xs font-semibold text-slate-500">負責導師</dt>
							<dd class="mt-0.5 font-semibold text-slate-900">{{ app.mentorName }}</dd>
						</div>
					</dl>
					<label class="block space-y-1">
						<span class="text-xs font-semibold text-slate-500">駁回原因（選填）</span>
						<textarea
							v-model.trim="rejectionReasons[app.id]"
							rows="2"
							maxlength="200"
							class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
							:disabled="rentalStore.isReviewing(app.id)"
						></textarea>
					</label>
					<div class="grid grid-cols-2 gap-2 pt-1">
						<button
							type="button"
							:disabled="rentalStore.isReviewing(app.id)"
							class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
							@click="handleApprove(app.id)"
						>
							核准
						</button>
						<button
							type="button"
							:disabled="rentalStore.isReviewing(app.id)"
							class="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
							@click="handleReject(app.id)"
						>
							駁回
						</button>
					</div>
				</div>
			</article>
		</section>
	</div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useRentalStore } from "../../stores/rental";
import { getAssetTypeLabel, type Application, type ApplicationType } from "../../types/rental";
import { formatTemporalZh } from "../../utils/date";
import { formatBorrowPeriodZh } from "../../utils/staffDisplay";

type ApprovalFilterKey = "borrow" | "return";
type AssetFilterKey = "all" | "venue" | "equipment";
type BorrowDateSortKey = "borrowedAtAsc" | "borrowedAtDesc";

interface ApprovalPanelConfig {
	key: ApprovalFilterKey;
	title: ApplicationType;
	emptyText: string;
	headingClass: string;
	articleClass: string;
	badgeClass: string;
	applicationType: ApplicationType;
}

const PANEL_CONFIG: Record<ApprovalFilterKey, ApprovalPanelConfig> = {
	borrow: {
		key: "borrow",
		title: "借用申請",
		emptyText: "目前沒有待審核借用申請。",
		headingClass: "text-sm font-semibold text-blue-900",
		articleClass:
			"rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm transition hover:shadow-md",
		badgeClass:
			"inline-flex rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900",
		applicationType: "借用申請",
	},
	return: {
		key: "return",
		title: "歸還申請",
		emptyText: "目前沒有待審核歸還申請。",
		headingClass: "text-sm font-semibold text-emerald-900",
		articleClass:
			"rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm transition hover:shadow-md",
		badgeClass:
			"inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900",
		applicationType: "歸還申請",
	},
};

const rentalStore = useRentalStore();
const authStore = useAuthStore();

const approvalFilter = ref<ApprovalFilterKey>("borrow");
const assetFilter = ref<AssetFilterKey>("all");
const borrowDateSort = ref<BorrowDateSortKey>("borrowedAtAsc");
const rejectionReasons = reactive<Record<string, string>>({});

function getApplicationAssetTypeLabel(app: Application): string {
	return getAssetTypeLabel(app.itemType) || "未分類";
}

function matchAssetFilter(app: Application): boolean {
	if (assetFilter.value === "all") return true;
	if (assetFilter.value === "venue") return app.itemType === "venue";
	if (assetFilter.value === "equipment") return app.itemType === "equipment";
	return true;
}

function sortByBorrowedAt(apps: Application[]): Application[] {
	return [...apps].sort((a, b) => {
		const diff = a.borrowedAt.localeCompare(b.borrowedAt);
		if (diff !== 0) {
			return borrowDateSort.value === "borrowedAtAsc" ? diff : -diff;
		}
		return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
	});
}

function getPendingApplications(type: ApplicationType): Application[] {
	const filtered = rentalStore.pendingApplications.filter(
		(a) => a.type === type && matchAssetFilter(a),
	);
	return sortByBorrowedAt(filtered);
}

const pendingBorrowApplications = computed(() => getPendingApplications("借用申請"));
const pendingReturnApplications = computed(() => getPendingApplications("歸還申請"));

const approvalTabs = computed(() => [
	{ ...PANEL_CONFIG.borrow, applications: pendingBorrowApplications.value },
	{ ...PANEL_CONFIG.return, applications: pendingReturnApplications.value },
]);

const activePanel = computed(() => PANEL_CONFIG[approvalFilter.value]);
const activeApplications = computed(() =>
	approvalFilter.value === "borrow"
		? pendingBorrowApplications.value
		: pendingReturnApplications.value,
);

async function handleApprove(applicationId: string) {
	await rentalStore.approveApplication(applicationId, authStore.staffName || authStore.staffAccount);
	delete rejectionReasons[applicationId];
}

async function handleReject(applicationId: string) {
	await rentalStore.rejectApplication(
		applicationId,
		authStore.staffName || authStore.staffAccount,
		rejectionReasons[applicationId] || "",
	);
	delete rejectionReasons[applicationId];
}
</script>
