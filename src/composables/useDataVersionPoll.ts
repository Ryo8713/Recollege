import { onBeforeUnmount, onMounted, ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";
import { applyKnownDataVersion, getLatestDataVersionRef } from "./dataVersionState";

export function useDataVersionPoll(options: {
	onRefresh: () => Promise<void>;
	pollIntervalMs?: number;
}) {
	const hasRemoteUpdate = ref(false);
	const isRefreshingLatestData = ref(false);
	const latestVersion = getLatestDataVersionRef();
	let dataVersionPollTimer: ReturnType<typeof setInterval> | null = null;

	async function syncDataVersionSnapshot() {
		try {
			const { version } = await sheetsApi.fetchDataVersion();
			applyKnownDataVersion(version);
		} catch {
			// Ignore version sync errors; borrow flow should still work.
		}
	}

	async function checkRemoteDataVersion() {
		if (document.visibilityState === "hidden") return;
		if (isRefreshingLatestData.value) return;
		try {
			const { version } = await sheetsApi.fetchDataVersion();
			if (!latestVersion.value) {
				applyKnownDataVersion(version);
				return;
			}
			if (version !== latestVersion.value) {
				applyKnownDataVersion(version);
				hasRemoteUpdate.value = true;
			}
		} catch {
			// Ignore polling errors and try again next tick.
		}
	}

	function dismissRemoteUpdate() {
		hasRemoteUpdate.value = false;
	}

	async function refreshLatestData() {
		isRefreshingLatestData.value = true;
		try {
			await options.onRefresh();
			await syncDataVersionSnapshot();
			hasRemoteUpdate.value = false;
		} finally {
			isRefreshingLatestData.value = false;
		}
	}

	onMounted(() => {
		void syncDataVersionSnapshot();
		dataVersionPollTimer = setInterval(() => {
			void checkRemoteDataVersion();
		}, options.pollIntervalMs ?? 30000);
	});

	onBeforeUnmount(() => {
		if (dataVersionPollTimer) {
			clearInterval(dataVersionPollTimer);
			dataVersionPollTimer = null;
		}
	});

	return {
		hasRemoteUpdate,
		isRefreshingLatestData,
		syncDataVersionSnapshot,
		dismissRemoteUpdate,
		refreshLatestData,
	};
}
