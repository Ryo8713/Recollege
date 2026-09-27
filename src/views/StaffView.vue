<template>
	<div class="space-y-4">
		<DataUpdateBanner
			:visible="hasRemoteUpdate"
			:refreshing="isRefreshingLatestData"
			message="申請或租借資料可能已更新，請重新整理。"
			refresh-label="更新管理資料"
			@dismiss="dismissRemoteUpdate"
			@refresh="refreshLatestData"
		/>

		<section
			v-if="assetsStore.loading"
			class="rounded-xl bg-white p-4 text-slate-600 shadow-sm ring-1 ring-slate-200"
		>
			讀取空間設備中...
		</section>

		<section
			v-if="assetsStore.loadError"
			class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
		>
			{{ assetsStore.loadError }}
		</section>

		<section
			v-if="rentalStore.loadError"
			class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
		>
			申請與租借紀錄讀取失敗：{{ rentalStore.loadError }}（空間／設備管理仍可使用）
		</section>

		<template v-if="!assetsStore.loading">
			<nav class="grid grid-cols-2 gap-2 sm:grid-cols-5">
				<button
					v-for="tab in tabs"
					:key="tab.key"
					type="button"
					class="rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.99] touch-manipulation"
					:class="
						activeTab === tab.key
							? 'border-slate-900 bg-slate-900 text-white shadow'
							: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
					"
					@click="activeTab = tab.key"
				>
					{{ tab.label }}
					<span
						v-if="tab.key === 'approvals' && rentalStore.pendingApplications.length > 0"
						class="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white"
					>
						{{ rentalStore.pendingApplications.length }}
					</span>
					<span
						v-if="tab.key === 'overview' && rentalStore.overdueRecords.length > 0"
						class="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white"
					>
						{{ rentalStore.overdueRecords.length }}
					</span>
				</button>
			</nav>

			<StaffApprovalsPanel v-if="activeTab === 'approvals'" />
			<StaffReviewedPanel v-else-if="activeTab === 'reviewed'" />
			<StaffAssetManager v-else-if="activeTab === 'assets'" />
			<BorrowingRulesManager v-else-if="activeTab === 'rules'" />
			<StaffDashboardPanel v-else-if="activeTab === 'overview'" />
		</template>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import BorrowingRulesManager from "../components/BorrowingRulesManager.vue";
import DataUpdateBanner from "../components/student-borrow/DataUpdateBanner.vue";
import StaffApprovalsPanel from "../components/StaffApprovalsPanel.vue";
import StaffAssetManager from "../components/StaffAssetManager.vue";
import StaffDashboardPanel from "../components/StaffDashboardPanel.vue";
import StaffReviewedPanel from "../components/StaffReviewedPanel.vue";
import { useDataVersionPoll } from "../composables/useDataVersionPoll";
import { useAssetsStore } from "../stores/assets";
import { useRentalStore } from "../stores/rental";

type TabKey = "approvals" | "reviewed" | "assets" | "rules" | "overview";

const tabs: { key: TabKey; label: string }[] = [
	{ key: "approvals", label: "審核申請" },
	{ key: "reviewed", label: "已審核紀錄" },
	{ key: "assets", label: "財物狀態監控" },
	{ key: "rules", label: "借用規則" },
	{ key: "overview", label: "管理總覽" },
];

const activeTab = ref<TabKey>("approvals");
const rentalStore = useRentalStore();
const assetsStore = useAssetsStore();

async function loadStaffData(force = false) {
	await Promise.all([
		assetsStore.loadAssets({ force }),
		rentalStore.loadApplications({ force }),
		rentalStore.loadRecords({ force }),
	]);
}

const {
	hasRemoteUpdate,
	isRefreshingLatestData,
	syncDataVersionSnapshot,
	dismissRemoteUpdate,
	refreshLatestData,
} = useDataVersionPoll({
	onRefresh: () => loadStaffData(true),
});

onMounted(() => {
	void (async () => {
		await loadStaffData();
		await syncDataVersionSnapshot();
	})();
});
</script>
