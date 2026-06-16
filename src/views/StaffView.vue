<template>
	<div class="space-y-4">
		<section
			v-if="hasRemoteUpdate"
			class="fixed right-4 top-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-lg"
		>
			<div class="flex items-start justify-between gap-3">
				<p class="font-semibold">申請或租借資料可能已更新，請重新整理。</p>
				<button
					type="button"
					class="-mr-1 rounded px-1.5 py-0.5 text-lg font-bold leading-none text-blue-700 transition hover:bg-blue-100"
					aria-label="關閉更新通知"
					@click="dismissRemoteUpdate"
				>
					×
				</button>
			</div>
			<button
				type="button"
				class="mt-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
				:disabled="refreshingData"
				@click="refreshStaffData"
			>
				{{ refreshingData ? "更新中..." : "更新管理資料" }}
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
const latestRemoteDataVersion = ref("");
const dismissedRemoteDataVersion = ref("");
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
		latestRemoteDataVersion.value = "";
		dismissedRemoteDataVersion.value = "";
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
		if (version !== lastKnownDataVersion.value && version !== dismissedRemoteDataVersion.value) {
			latestRemoteDataVersion.value = version;
			hasRemoteUpdate.value = true;
		}
	} catch {
		// Ignore intermittent network errors for polling.
	}
}

function dismissRemoteUpdate() {
	dismissedRemoteDataVersion.value = latestRemoteDataVersion.value;
	hasRemoteUpdate.value = false;
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
