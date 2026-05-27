import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { sheetsApi } from "../services/sheetsApi";
import type { Asset, AssetType } from "../types/rental";

export const useAssetsStore = defineStore("assets", () => {
	const assets = ref<Asset[]>([]);
	const loading = ref(false);
	const loadError = ref("");
	const loadedAt = ref(0);
	const inFlightLoad = ref<Promise<void> | null>(null);
	const LOAD_TTL_MS = 60 * 1000;

	const venues = computed(() => assets.value.filter((a) => a.type === "venue"));
	const equipments = computed(() => assets.value.filter((a) => a.type === "equipment"));

	const availableVenues = computed(() => venues.value.filter((a) => a.status === "可租借"));
	const availableEquipments = computed(() => equipments.value.filter((a) => a.status === "可租借"));

	function shouldLoadAssets(force = false): boolean {
		if (force) return true;
		if (!loadedAt.value) return true;
		return Date.now() - loadedAt.value > LOAD_TTL_MS;
	}

	async function loadAssets(options?: { force?: boolean }) {
		const force = Boolean(options?.force);
		if (inFlightLoad.value) {
			return inFlightLoad.value;
		}
		if (!shouldLoadAssets(force)) {
			return;
		}

		loading.value = true;
		loadError.value = "";
		inFlightLoad.value = (async () => {
			try {
				assets.value = await sheetsApi.fetchAssets();
				loadedAt.value = Date.now();
			} catch (error) {
				loadError.value = error instanceof Error ? error.message : "讀取空間設備失敗";
				assets.value = [];
			} finally {
				loading.value = false;
				inFlightLoad.value = null;
			}
		})();
		return inFlightLoad.value;
	}

	async function addAsset(name: string, type: AssetType): Promise<Asset> {
		const trimmedName = name.trim();
		if (!trimmedName) {
			throw new Error("請輸入名稱");
		}

		await sheetsApi.createAsset({ name: trimmedName, type });
		await loadAssets();
		const created = assets.value.find((a) => a.name === trimmedName && a.type === type);
		if (created) return created;
		throw new Error("已寫入試算表，但讀取列表時找不到新項目，請重新整理頁面。");
	}

	function setAssetStatus(assetId: string, status: Asset["status"]) {
		const asset = assets.value.find((a) => a.id === assetId);
		if (asset) {
			asset.status = status;
		}
	}

	function removeAsset(assetId: string) {
		assets.value = assets.value.filter((a) => a.id !== assetId);
	}

	return {
		assets,
		loading,
		loadError,
		loadedAt,
		venues,
		equipments,
		availableVenues,
		availableEquipments,
		loadAssets,
		addAsset,
		setAssetStatus,
		removeAsset,
	};
});
