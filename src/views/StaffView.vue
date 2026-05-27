<template>
	<div class="space-y-4">
		<section
			v-if="hasRemoteUpdate"
			class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
		>
			<p>偵測到新的申請或租借資料更新，是否立即重新讀取？</p>
			<button
				type="button"
				class="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
				:disabled="refreshingData"
				@click="refreshStaffData"
			>
				{{ refreshingData ? "更新中..." : "重新讀取資料" }}
			</button>
		</section>

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

		<StaffOverview v-if="!assetsStore.loading" />
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import StaffOverview from "../components/StaffOverview.vue";
import { useAssetsStore } from "../stores/assets";
import { useRentalStore } from "../stores/rental";
import { sheetsApi } from "../services/sheetsApi";

const rentalStore = useRentalStore();
const assetsStore = useAssetsStore();
const hasRemoteUpdate = ref(false);
const refreshingData = ref(false);
const lastKnownDataVersion = ref("");
let versionPollTimer: ReturnType<typeof setInterval> | null = null;

async function loadStaffData(force = false) {
	await Promise.all([
		assetsStore.loadAssets({ force }),
		rentalStore.loadApplications({ force }),
		rentalStore.loadRecords({ force }),
	]);
}

async function syncDataVersionSnapshot() {
	try {
		const { version } = await sheetsApi.fetchDataVersion();
		lastKnownDataVersion.value = version;
	} catch {
		// Ignore version errors to avoid blocking staff operations.
	}
}

async function checkRemoteDataVersion() {
	if (document.visibilityState === "hidden") return;
	try {
		const { version } = await sheetsApi.fetchDataVersion();
		if (!lastKnownDataVersion.value) {
			lastKnownDataVersion.value = version;
			return;
		}
		if (version !== lastKnownDataVersion.value) {
			hasRemoteUpdate.value = true;
		}
	} catch {
		// Ignore intermittent network errors for polling.
	}
}

async function refreshStaffData() {
	refreshingData.value = true;
	try {
		await loadStaffData(true);
		await syncDataVersionSnapshot();
		hasRemoteUpdate.value = false;
	} finally {
		refreshingData.value = false;
	}
}

onMounted(() => {
	void (async () => {
		await loadStaffData();
		await syncDataVersionSnapshot();
		versionPollTimer = setInterval(() => {
			void checkRemoteDataVersion();
		}, 30000);
	})();
});

onBeforeUnmount(() => {
	if (versionPollTimer) {
		clearInterval(versionPollTimer);
		versionPollTimer = null;
	}
});
</script>
