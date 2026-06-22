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
        <h4 class="text-base font-bold text-slate-900">新增財物</h4>
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
        <h4 class="text-base font-bold text-slate-900">設定停用日期</h4>
        <p class="mt-1 text-sm text-slate-600">
          {{ pauseTargetAsset.name }}（{{ pauseTargetAsset.type === "venue" ? "空間" : "設備" }}）
        </p>
        <p class="mt-2 text-xs text-slate-500">停用期間學生無法借用，且不可與現有借用時段衝突。</p>
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
              {{ pauseSubmitting ? "儲存中..." : "儲存停用區間" }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-bold text-slate-900">財物狀態監控</h3>
          <p class="mt-0.5 text-xs text-slate-500">查詢各空間／設備使用狀況</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          @click="showAddPanel = true"
        >
          新增財物
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-[11px] font-semibold text-slate-500">總計</p>
          <p class="mt-1 text-xl font-bold text-slate-900">{{ summaryStats.total }}</p>
        </article>
        <article class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <p class="text-[11px] font-semibold text-emerald-700">可借</p>
          <p class="mt-1 text-xl font-bold text-emerald-900">{{ summaryStats.available }}</p>
        </article>
        <article class="rounded-xl border border-red-200 bg-red-50/60 p-3">
          <p class="text-[11px] font-semibold text-red-700">借用中</p>
          <p class="mt-1 text-xl font-bold text-red-900">{{ summaryStats.borrowed }}</p>
        </article>
        <article class="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
          <p class="text-[11px] font-semibold text-blue-700">待生效</p>
          <p class="mt-1 text-xl font-bold text-blue-900">{{ summaryStats.pending }}</p>
        </article>
        <article class="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p class="text-[11px] font-semibold text-amber-700">停用／暫停</p>
          <p class="mt-1 text-xl font-bold text-amber-900">{{ summaryStats.unavailable }}</p>
        </article>
        <article class="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
          <p class="text-[11px] font-semibold text-rose-700">逾期</p>
          <p class="mt-1 text-xl font-bold text-rose-900">{{ summaryStats.overdue }}</p>
        </article>
      </div>
    </div>

    <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in typeFilterOptions"
          :key="`type-${option.value}`"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
          :class="typeFilter === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
          @click="typeFilter = option.value"
        >
          {{ option.label }}
        </button>
        <span class="mx-1 hidden h-6 w-px self-center bg-slate-200 sm:inline-block" aria-hidden="true"></span>
        <button
          v-for="option in statusFilterOptions"
          :key="`status-${option.value}`"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
          :class="statusFilter === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'"
          @click="statusFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="allAssets.length === 0" class="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
      尚無資產，請新增。
    </div>
    <p v-else-if="filteredAssetViews.length === 0" class="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
      目前沒有符合篩選條件的資產。
    </p>
    <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="view in filteredAssetViews"
        :key="view.asset.id"
        class="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
        :class="view.cardBorderClass"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="view.asset.type === 'venue' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'"
              >
                {{ view.asset.type === "venue" ? "空間" : "設備" }}
              </span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="view.statusBadgeClass">
                {{ view.statusLabel }}
              </span>
              <span
                v-if="view.isOverdue"
                class="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800"
              >
                已逾期
              </span>
              <span
                v-else-if="view.isDueSoon"
                class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              >
                24h 內到期
              </span>
            </div>
            <h4 class="mt-2 truncate text-base font-bold text-slate-900">{{ view.asset.name }}</h4>
          </div>
        </div>

        <div v-if="view.activeRecord" class="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
          <p class="font-semibold text-slate-700">目前借用資訊</p>
          <dl class="grid grid-cols-1 gap-1.5 text-slate-700">
            <div>
              <dt class="text-[11px] font-semibold text-slate-500">借用人</dt>
              <dd class="font-semibold text-slate-900">{{ view.activeRecord.studentName }}（{{ view.activeRecord.studentId }}）</dd>
            </div>
            <div>
              <dt class="text-[11px] font-semibold text-slate-500">聯絡電話</dt>
              <dd class="font-semibold text-slate-900">{{ view.activeRecord.studentPhone || "未記錄" }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-semibold text-slate-500">活動 / 團體</dt>
              <dd class="font-semibold text-slate-900">{{ view.activeRecord.activityName }} / {{ view.activeRecord.borrowerGroup }}</dd>
            </div>
            <div v-if="view.activeRecord.mentorName">
              <dt class="text-[11px] font-semibold text-slate-500">負責導師</dt>
              <dd class="font-semibold text-slate-900">{{ view.activeRecord.mentorName }}</dd>
            </div>
            <div>
              <dt class="text-[11px] font-semibold text-slate-500">借用時段</dt>
              <dd class="font-semibold text-slate-900">{{ formatBorrowPeriodZh(view.activeRecord.borrowedAt, view.activeRecord.expectedReturnAt) }}</dd>
            </div>
          </dl>
          <p v-if="view.activeRecord.returnRequestStatus === '待審核'" class="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
            歸還申請待審核
          </p>
        </div>

        <div v-else-if="view.displayStatus === 'available'" class="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-800">
          目前可借，無進行中借用。
        </div>

        <div v-if="view.upcomingPauseRanges.length > 0" class="mt-3 rounded-xl border border-slate-200 bg-white p-2.5">
          <p class="text-[11px] font-semibold text-slate-500">停用時段</p>
          <ul class="mt-1 space-y-1 text-[11px] text-slate-700">
            <li v-for="range in view.upcomingPauseRanges" :key="range.id">
              <span
                class="font-semibold"
                :class="range.isActiveToday ? 'text-amber-800' : 'text-slate-700'"
              >
                {{ formatDateSlash(range.startDate) }} - {{ formatDateSlash(range.endDate) }}
              </span>
              <span v-if="range.note" class="text-slate-500">（{{ range.note }}）</span>
              <span v-if="range.isActiveToday" class="ml-1 text-amber-700">· 進行中</span>
            </li>
          </ul>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="w-full rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
            :disabled="pauseLoading || pauseSubmitting"
            @click="openPausePanel(view.asset.id)"
          >
            設定停用日期
          </button>
          <button
            type="button"
            class="w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isDeletingAsset(view.asset.id)"
            @click="handleDeleteAsset(view.asset)"
          >
            {{ isDeletingAsset(view.asset.id) ? "刪除中..." : "刪除" }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import AssetAddFeedback from "./AssetAddFeedback.vue";
import { sheetsApi } from "../services/sheetsApi";
import { useAssetsStore } from "../stores/assets";
import { useAuthStore } from "../stores/auth";
import { isOverdue, useRentalStore } from "../stores/rental";
import { formatDateSlash, formatTemporalZh, getTodayText } from "../utils/date";
import type { Asset, AssetType, BorrowRecord } from "../types/rental";

type DisplayStatus = "available" | "borrowed" | "pending" | "disabled" | "paused" | "globalPaused";
type TypeFilter = "all" | "venue" | "equipment";
type StatusFilter = "all" | DisplayStatus | "overdue" | "dueSoon";

interface PauseRangeView {
  id: string;
  assetId: string;
  startDate: string;
  endDate: string;
  note: string;
  isActiveToday: boolean;
}

interface AssetMonitorView {
  asset: Asset;
  displayStatus: DisplayStatus;
  statusLabel: string;
  statusBadgeClass: string;
  cardBorderClass: string;
  activeRecord: BorrowRecord | null;
  isOverdue: boolean;
  isDueSoon: boolean;
  upcomingPauseRanges: PauseRangeView[];
}

const assetsStore = useAssetsStore();
const rentalStore = useRentalStore();
const authStore = useAuthStore();

const showAddPanel = ref(false);
const showPausePanel = ref(false);
const pauseTargetAssetId = ref("");
const newAssetName = ref("");
const newAssetType = ref<AssetType>("venue");
const typeFilter = ref<TypeFilter>("all");
const statusFilter = ref<StatusFilter>("all");
const pauseLoading = ref(false);
const pauseSubmitting = ref(false);
const deletingAssetIds = ref<string[]>([]);
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
const globalPauseRanges = ref<Array<{ startDate: string; endDate: string; note: string }>>([]);
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
const todayText = getTodayText();
const pauseTargetAsset = computed(() =>
  allAssets.value.find((asset) => asset.id === pauseTargetAssetId.value) || null,
);

function isDeletingAsset(assetId: string): boolean {
  return deletingAssetIds.value.includes(assetId);
}

const typeFilterOptions: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "全部類型" },
  { value: "venue", label: "空間" },
  { value: "equipment", label: "設備" },
];

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部狀態" },
  { value: "available", label: "可借" },
  { value: "borrowed", label: "借用中" },
  { value: "pending", label: "待生效" },
  { value: "paused", label: "停用／暫停" },
  { value: "dueSoon", label: "24h 內到期" },
  { value: "overdue", label: "已逾期" },
];

function datePart(value: string): string {
  const text = String(value || "").trim();
  const standardDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (standardDate) return `${standardDate[1]}-${standardDate[2]}-${standardDate[3]}`;
  return text.slice(0, 10);
}

function diffDaysFromToday(targetDateText: string): number {
  const today = new Date(`${todayText}T00:00:00`);
  const target = new Date(`${datePart(targetDateText)}T00:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(target.getTime())) return 0;
  return Math.floor((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function isDueSoonRecord(record: BorrowRecord): boolean {
  if (record.status !== "租借中") return false;
  const days = diffDaysFromToday(record.expectedReturnAt);
  return days >= 0 && days <= 1;
}

function getActiveRecordForAsset(assetId: string): BorrowRecord | null {
  const matches = rentalStore.records.filter(
    (record) =>
      (record.status === "租借中" || record.status === "待生效") &&
      record.assetIds.includes(assetId),
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => {
    const statusOrder: Partial<Record<BorrowRecord["status"], number>> = { 租借中: 0, 待生效: 1 };
    const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    return a.borrowedAt.localeCompare(b.borrowedAt);
  })[0];
}

function isPausedToday(assetId: string): boolean {
  return pauseRanges.value.some(
    (range) => range.assetId === assetId && range.startDate <= todayText && range.endDate >= todayText,
  );
}

function isGloballyClosedToday(): boolean {
  return globalPauseRanges.value.some(
    (range) => range.startDate <= todayText && range.endDate >= todayText,
  );
}

function getUpcomingPauseRanges(assetId: string): PauseRangeView[] {
  return pauseRanges.value
    .filter((range) => range.assetId === assetId && range.endDate >= todayText)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((range) => ({
      ...range,
      isActiveToday: range.startDate <= todayText && range.endDate >= todayText,
    }));
}

function resolveDisplayStatus(asset: Asset, activeRecord: BorrowRecord | null): DisplayStatus {
  if (activeRecord?.status === "租借中") return "borrowed";
  if (activeRecord?.status === "待生效") return "pending";
  if (asset.status === "停用中") return "disabled";
  if (isGloballyClosedToday()) return "globalPaused";
  if (isPausedToday(asset.id)) return "paused";
  return "available";
}

function getStatusMeta(status: DisplayStatus) {
  if (status === "borrowed") {
    return {
      label: "借用中",
      badgeClass: "bg-red-100 text-red-800",
      cardBorderClass: "border-red-200",
    };
  }
  if (status === "pending") {
    return {
      label: "待生效",
      badgeClass: "bg-blue-100 text-blue-800",
      cardBorderClass: "border-blue-200",
    };
  }
  if (status === "disabled") {
    return {
      label: "停用中",
      badgeClass: "bg-amber-100 text-amber-800",
      cardBorderClass: "border-amber-200",
    };
  }
  if (status === "paused") {
    return {
      label: "今日暫停",
      badgeClass: "bg-amber-100 text-amber-800",
      cardBorderClass: "border-amber-200",
    };
  }
  if (status === "globalPaused") {
    return {
      label: "全校暫停",
      badgeClass: "bg-amber-100 text-amber-800",
      cardBorderClass: "border-amber-300",
    };
  }
  return {
    label: "可借",
    badgeClass: "bg-emerald-100 text-emerald-800",
    cardBorderClass: "border-emerald-200",
  };
}

const assetViews = computed<AssetMonitorView[]>(() =>
  allAssets.value.map((asset) => {
    const activeRecord = getActiveRecordForAsset(asset.id);
    const displayStatus = resolveDisplayStatus(asset, activeRecord);
    const statusMeta = getStatusMeta(displayStatus);
    const overdue = activeRecord ? isOverdue(activeRecord) : false;
    const dueSoon = activeRecord ? isDueSoonRecord(activeRecord) : false;

    return {
      asset,
      displayStatus,
      statusLabel: statusMeta.label,
      statusBadgeClass: statusMeta.badgeClass,
      cardBorderClass: statusMeta.cardBorderClass,
      activeRecord,
      isOverdue: overdue,
      isDueSoon: dueSoon,
      upcomingPauseRanges: getUpcomingPauseRanges(asset.id),
    };
  }),
);

const summaryStats = computed(() => {
  const views = assetViews.value;
  return {
    total: views.length,
    available: views.filter((view) => view.displayStatus === "available").length,
    borrowed: views.filter((view) => view.displayStatus === "borrowed").length,
    pending: views.filter((view) => view.displayStatus === "pending").length,
    unavailable: views.filter((view) => view.displayStatus === "disabled" || view.displayStatus === "paused" || view.displayStatus === "globalPaused").length,
    overdue: views.filter((view) => view.isOverdue).length,
  };
});

const filteredAssetViews = computed(() => {
  let views = assetViews.value;

  if (typeFilter.value === "venue") {
    views = views.filter((view) => view.asset.type === "venue");
  } else if (typeFilter.value === "equipment") {
    views = views.filter((view) => view.asset.type === "equipment");
  }

  if (statusFilter.value === "overdue") {
    views = views.filter((view) => view.isOverdue);
  } else if (statusFilter.value === "dueSoon") {
    views = views.filter((view) => view.isDueSoon);
  } else if (statusFilter.value === "paused") {
    views = views.filter((view) => view.displayStatus === "paused" || view.displayStatus === "globalPaused");
  } else if (statusFilter.value !== "all") {
    views = views.filter((view) => view.displayStatus === statusFilter.value);
  }

  const statusRank: Record<DisplayStatus, number> = {
    borrowed: 0,
    pending: 1,
    globalPaused: 2,
    paused: 3,
    disabled: 4,
    available: 5,
  };

  return [...views].sort((a, b) => {
    const rankDiff = statusRank[a.displayStatus] - statusRank[b.displayStatus];
    if (rankDiff !== 0) return rankDiff;
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.asset.name.localeCompare(b.asset.name, "zh-Hant");
  });
});

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

async function handleDeleteAsset(asset: Asset) {
  const confirmed = window.confirm(
    `確定要刪除${typeLabel(asset.type)}「${asset.name}」嗎？\n\n若此資產仍有待審核、待生效或租借中紀錄，系統會拒絕刪除。`,
  );
  if (!confirmed) return;

  deletingAssetIds.value = [...deletingAssetIds.value, asset.id];
  feedback.phase = "loading";
  feedback.loadingText = `正在刪除${typeLabel(asset.type)}…`;

  try {
    await assetsStore.deleteAsset(asset.id, authStore.staffAccount);
    await loadPauseRanges();
    feedback.phase = "result";
    feedback.success = true;
    feedback.title = "刪除成功";
    feedback.message = `已刪除${typeLabel(asset.type)}「${asset.name}」。`;
  } catch (error) {
    feedback.phase = "result";
    feedback.success = false;
    feedback.title = "刪除失敗";
    feedback.message = error instanceof Error ? error.message : "請稍後再試。";
  } finally {
    deletingAssetIds.value = deletingAssetIds.value.filter((id) => id !== asset.id);
  }
}

function formatBorrowPeriodZh(start: string, end: string): string {
  const startText = String(start || "").trim();
  const endText = String(end || "").trim();
  const startDateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(startText);
  const endDateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(endText);
  if (startDateTime && endDateTime && startText.slice(0, 10) === endText.slice(0, 10)) {
    const [, y, m, d, startTime] = startDateTime;
    const [, , , , endTime] = endDateTime;
    return `${y}年${Number(m)}月${Number(d)}日 ${startTime} ➜ ${endTime}`;
  }
  return `${formatTemporalZh(startText)} ➜ ${formatTemporalZh(endText)}`;
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
    const [assetPauses, globalPauses] = await Promise.all([
      sheetsApi.fetchAssetPauseRanges(),
      sheetsApi.fetchGlobalPauseRanges(),
    ]);
    pauseRanges.value = assetPauses;
    globalPauseRanges.value = globalPauses.map((range) => ({
      startDate: range.startDate,
      endDate: range.endDate,
      note: range.note,
    }));
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
    feedback.message = "已儲存停用日期，學生端將無法在該期間借用。";
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
