<template>
  <div class="space-y-6">
    <AssetAddFeedback
      :phase="feedback.phase"
      :loading-text="feedback.loadingText"
      :success="feedback.success"
      :title="feedback.title"
      :message="feedback.message"
      @close="closeFeedback"
    />
    <div
      v-if="showAddPanel"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="showAddPanel = false"
    >
      <section class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h4 class="text-base font-bold text-slate-900">新增資產</h4>
        <form class="mt-4 space-y-3" @submit.prevent="submitAddAsset">
          <select
            v-model="newAssetType"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            :disabled="isAdding"
          >
            <option value="venue">空間</option>
            <option value="equipment">設備</option>
          </select>
          <input
            v-model.trim="newAssetName"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring disabled:bg-slate-100"
            placeholder="輸入名稱"
            maxlength="50"
            :disabled="isAdding"
          />
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isAdding"
              @click="showAddPanel = false"
            >
              取消
            </button>
            <button
              type="submit"
              class="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isAdding"
            >
              {{ isAdding ? "新增中..." : "新增" }}
            </button>
          </div>
        </form>
      </section>
    </div>
    <div
      v-if="showPausePanel && pauseTargetAsset"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="showPausePanel = false"
    >
      <section class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h4 class="text-base font-bold text-slate-900">設定暫停出借</h4>
        <p class="mt-1 text-sm text-slate-600">
          {{ pauseTargetAsset.name }}（{{ pauseTargetAsset.type === "venue" ? "空間" : "設備" }}）
        </p>
        <form class="mt-4 space-y-3" @submit.prevent="submitPauseRange">
          <label class="block space-y-1 text-sm text-slate-700">
            <span class="font-medium">開始日期</span>
            <input v-model="pauseForm.startDate" type="date" :min="todayText" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label class="block space-y-1 text-sm text-slate-700">
            <span class="font-medium">結束日期</span>
            <input v-model="pauseForm.endDate" type="date" :min="pauseForm.startDate || todayText" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label class="block space-y-1 text-sm text-slate-700">
            <span class="font-medium">備註（選填）</span>
            <input
              v-model.trim="pauseForm.note"
              maxlength="60"
              class="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="例如：例行保養"
            />
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" :disabled="pauseSubmitting" @click="showPausePanel = false">
              取消
            </button>
            <button type="submit" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="pauseSubmitting">
              {{ pauseSubmitting ? "儲存中..." : "儲存暫停區間" }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-slate-900">狀態總覽</h3>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            @click="showAddPanel = true"
          >
            新增資產
          </button>
          <span class="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800">
            空間 {{ assetsStore.venues.length }}
          </span>
          <span class="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
            設備 {{ assetsStore.equipments.length }}
          </span>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
            總計 {{ allAssets.length }}
          </span>
        </div>
      </div>

      <div v-if="allAssets.length === 0" class="text-sm text-slate-400">尚無資產，請新增。</div>
      <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section
          v-for="section in statusSections"
          :key="section.status"
          class="rounded-xl border p-3"
          :class="section.sectionClass"
        >
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-bold" :class="section.titleClass">{{ section.label }}</h4>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="section.badgeClass">
              {{ section.assets.length }} 項
            </span>
          </div>

          <p v-if="section.assets.length === 0" class="text-xs text-slate-500">目前無資產。</p>
          <div v-else class="space-y-2">
            <article
              v-for="asset in section.assets"
              :key="asset.id"
              class="rounded-xl border bg-slate-50 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              :class="asset.type === 'venue' ? 'border-blue-200' : 'border-emerald-200'"
            >
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    :class="asset.type === 'venue' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'"
                  >
                    {{ asset.type === "venue" ? "空間" : "設備" }}
                  </span>
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(asset.status)">
                    {{ statusLabel(asset.status) }}
                  </span>
                </div>

                <p class="text-sm font-bold text-slate-900">{{ asset.name }}</p>

                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    :value="asset.status"
                    class="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    :disabled="isAdding"
                    @change="changeStatus(asset.id, ($event.target as HTMLSelectElement).value as Asset['status'])"
                  >
                    <option value="可租借">閒置中</option>
                    <option value="已借出">借出中</option>
                    <option value="停用中">停用中</option>
                  </select>
                  <button
                    type="button"
                    class="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
                    :disabled="pauseLoading || pauseSubmitting"
                    @click="openPausePanel(asset.id)"
                  >
                    暫停出借
                  </button>
                </div>
                <div v-if="getUpcomingPauseRanges(asset.id).length > 0" class="rounded-lg border border-slate-200 bg-white p-2">
                  <p class="text-[11px] font-semibold text-slate-500">暫停時段</p>
                  <ul class="mt-1 space-y-1 text-[11px] text-slate-700">
                    <li v-for="range in getUpcomingPauseRanges(asset.id)" :key="range.id">
                      {{ formatDateZh(range.startDate) }} - {{ formatDateZh(range.endDate) }}
                      <span v-if="range.note" class="text-slate-500">（{{ range.note }}）</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <button
                    type="button"
                    class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    :disabled="isAdding"
                    @click="removeAsset(asset.id)"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import AssetAddFeedback from "./AssetAddFeedback.vue";
import { sheetsApi } from "../services/sheetsApi";
import { useAssetsStore } from "../stores/assets";
import type { Asset, AssetType } from "../types/rental";

const assetsStore = useAssetsStore();

const showAddPanel = ref(false);
const showPausePanel = ref(false);
const pauseTargetAssetId = ref("");
const newAssetName = ref("");
const newAssetType = ref<AssetType>("venue");
const pauseLoading = ref(false);
const pauseSubmitting = ref(false);
const pauseRanges = ref<
  Array<{
    id: string;
    assetId: string;
    startDate: string;
    endDate: string;
    note: string;
    createdAt: string;
  }>
>([]);
const pauseForm = reactive({
  startDate: "",
  endDate: "",
  note: "",
});

type FeedbackPhase = null | "loading" | "result";

const feedback = reactive<{
  phase: FeedbackPhase;
  loadingText: string;
  success: boolean;
  title: string;
  message: string;
}>({
  phase: null,
  loadingText: "",
  success: true,
  title: "",
  message: "",
});

const isAdding = computed(() => feedback.phase === "loading");
const allAssets = computed(() => [...assetsStore.assets]);
const statusOrder: Asset["status"][] = ["可租借", "已借出", "停用中"];
const todayText = getTodayText();
const pauseTargetAsset = computed(() =>
  allAssets.value.find((asset) => asset.id === pauseTargetAssetId.value) || null,
);

function getStatusSectionMeta(status: Asset["status"]) {
  if (status === "可租借") {
    return {
      label: "閒置中",
      sectionClass: "border-emerald-200 bg-emerald-50/50",
      titleClass: "text-emerald-900",
      badgeClass: "bg-emerald-100 text-emerald-800",
    };
  }
  if (status === "已借出") {
    return {
      label: "借出中",
      sectionClass: "border-red-200 bg-red-50/50",
      titleClass: "text-red-900",
      badgeClass: "bg-red-100 text-red-800",
    };
  }
  return {
    label: "停用中",
    sectionClass: "border-amber-200 bg-amber-50/50",
    titleClass: "text-amber-900",
    badgeClass: "bg-amber-100 text-amber-800",
  };
}

const statusSections = computed(() =>
  statusOrder.map((status) => ({
    status,
    ...getStatusSectionMeta(status),
    assets: allAssets.value.filter((asset) => asset.status === status),
  })),
);

function statusClass(status: Asset["status"]) {
  if (status === "可租借") return "bg-green-100 text-green-800";
  if (status === "已借出") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function statusLabel(status: Asset["status"]) {
  if (status === "可租借") return "閒置中";
  if (status === "已借出") return "借出中";
  return "停用中";
}

function closeFeedback() {
  feedback.phase = null;
}

function typeLabel(type: AssetType) {
  return type === "venue" ? "空間" : "設備";
}

async function submitAdd(name: string, type: AssetType, clearInput: () => void) {
  feedback.phase = "loading";
  feedback.loadingText = `正在新增${typeLabel(type)}…`;

  try {
    const asset = await assetsStore.addAsset(name, type);
    clearInput();
    feedback.phase = "result";
    feedback.success = true;
    feedback.title = "新增成功";
    feedback.message = `已成功新增${typeLabel(type)}「${asset.name}」，學生登記畫面將可選擇此項目。`;
  } catch (error) {
    feedback.phase = "result";
    feedback.success = false;
    feedback.title = "新增失敗";
    feedback.message = error instanceof Error ? error.message : "請稍後再試。";
  }
}

async function submitAddAsset() {
  if (!newAssetName.value) {
    feedback.phase = "result";
    feedback.success = false;
    feedback.title = "無法新增";
    feedback.message = "請輸入資產名稱。";
    return;
  }
  await submitAdd(newAssetName.value, newAssetType.value, () => {
    newAssetName.value = "";
    showAddPanel.value = false;
  });
}

function changeStatus(id: string, status: Asset["status"]) {
  assetsStore.setAssetStatus(id, status);
}

function removeAsset(id: string) {
  assetsStore.removeAsset(id);
}

function getTodayText(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDateZh(dateText: string): string {
  const [year, month, day] = String(dateText || "").split("-");
  if (!year || !month || !day) return dateText;
  return `${year}/${Number(month)}/${Number(day)}`;
}

function getUpcomingPauseRanges(assetId: string) {
  return pauseRanges.value
    .filter((range) => range.assetId === assetId && range.endDate >= todayText)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function openPausePanel(assetId: string) {
  pauseTargetAssetId.value = assetId;
  pauseForm.startDate = todayText;
  pauseForm.endDate = todayText;
  pauseForm.note = "";
  showPausePanel.value = true;
}

async function loadPauseRanges() {
  pauseLoading.value = true;
  try {
    pauseRanges.value = await sheetsApi.fetchAssetPauseRanges();
  } finally {
    pauseLoading.value = false;
  }
}

async function submitPauseRange() {
  const assetId = pauseTargetAssetId.value;
  if (!assetId || !pauseForm.startDate || !pauseForm.endDate) {
    feedback.phase = "result";
    feedback.success = false;
    feedback.title = "無法儲存";
    feedback.message = "請完整填寫開始與結束日期。";
    return;
  }
  if (pauseForm.endDate < pauseForm.startDate) {
    feedback.phase = "result";
    feedback.success = false;
    feedback.title = "無法儲存";
    feedback.message = "結束日期不可早於開始日期。";
    return;
  }
  pauseSubmitting.value = true;
  try {
    await sheetsApi.createAssetPauseRange({
      assetId,
      startDate: pauseForm.startDate,
      endDate: pauseForm.endDate,
      note: pauseForm.note,
    });
    await loadPauseRanges();
    showPausePanel.value = false;
    feedback.phase = "result";
    feedback.success = true;
    feedback.title = "設定成功";
    feedback.message = "已儲存暫停出借時段。";
  } catch (error) {
    feedback.phase = "result";
    feedback.success = false;
    feedback.title = "設定失敗";
    feedback.message = error instanceof Error ? error.message : "請稍後再試。";
  } finally {
    pauseSubmitting.value = false;
  }
}

onMounted(() => {
  void loadPauseRanges();
});
</script>
