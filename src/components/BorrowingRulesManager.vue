<template>
  <div class="space-y-4">
    <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
      <p class="font-semibold">借用規則說明</p>
      <p class="mt-1 text-xs leading-relaxed text-amber-800">
        全校暫停區間，所有空間與設備不開放借用；國定假日僅調整空間可借用時段（08:00–23:00），設備仍依一般規則借用。
      </p>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-bold text-slate-900">全校暫停區間</h3>
          <p class="mt-1 text-xs text-slate-500">適用寒暑假或全校維護，期間內所有資產完全禁止借用。</p>
        </div>
        <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          共 {{ globalPauses.length }} 筆
        </span>
      </div>

      <form class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[160px_160px_1fr_auto]" @submit.prevent="submitAddGlobalPause">
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">開始日期</span>
          <input
            v-model="globalPauseForm.startDate"
            type="date"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            :disabled="globalPauseSubmitting"
          />
        </label>
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">結束日期</span>
          <input
            v-model="globalPauseForm.endDate"
            type="date"
            :min="globalPauseForm.startDate || todayText"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            :disabled="globalPauseSubmitting"
          />
        </label>
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">備註（選填）</span>
          <input
            v-model.trim="globalPauseForm.note"
            maxlength="60"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            placeholder="例如：暑假"
            :disabled="globalPauseSubmitting"
          />
        </label>
        <div class="flex items-end">
          <button
            type="submit"
            class="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            :disabled="globalPauseSubmitting"
          >
            {{ globalPauseSubmitting ? "新增中..." : "新增暫停區間" }}
          </button>
        </div>
      </form>

      <p v-if="globalPauseLoading" class="mt-4 text-sm text-slate-500">讀取全校暫停區間中...</p>
      <p v-else-if="globalPauses.length === 0" class="mt-4 text-sm text-slate-400">尚未設定全校暫停區間。</p>
      <ul v-else class="mt-4 space-y-2">
        <li
          v-for="pause in globalPauses"
          :key="pause.id"
          class="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2"
        >
          <div>
            <p class="text-sm font-semibold text-slate-900">
              {{ formatDateZh(pause.startDate) }} - {{ formatDateZh(pause.endDate) }}
              <span
                v-if="isActiveToday(pause)"
                class="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
              >
                進行中
              </span>
            </p>
            <p v-if="pause.note" class="text-xs text-slate-500">{{ pause.note }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            :disabled="deletingGlobalPauseId === pause.id"
            @click="removeGlobalPause(pause.id)"
          >
            {{ deletingGlobalPauseId === pause.id ? "刪除中..." : "刪除" }}
          </button>
        </li>
      </ul>
    </div>

    <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-bold text-slate-900">國定假日</h3>
          <p class="mt-1 text-xs text-slate-500">
            國定假日會讓空間改用假日可借時段（08:00–23:00）；平日為 17:00–23:00。設備不受此規則影響。
          </p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          共 {{ holidays.length }} 天
        </span>
      </div>

      <form class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_auto]" @submit.prevent="submitAddHoliday">
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">日期</span>
          <input
            v-model="holidayForm.date"
            type="date"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            :disabled="holidaySubmitting"
          />
        </label>
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">備註（選填）</span>
          <input
            v-model.trim="holidayForm.note"
            maxlength="60"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            placeholder="例如：國慶日"
            :disabled="holidaySubmitting"
          />
        </label>
        <div class="flex items-end">
          <button
            type="submit"
            class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            :disabled="holidaySubmitting"
          >
            {{ holidaySubmitting ? "新增中..." : "新增假日" }}
          </button>
        </div>
      </form>

      <p v-if="holidayLoading" class="mt-4 text-sm text-slate-500">讀取國定假日中...</p>
      <p v-else-if="holidays.length === 0" class="mt-4 text-sm text-slate-400">尚未設定任何國定假日。</p>
      <ul v-else class="mt-4 space-y-2">
        <li
          v-for="holiday in holidays"
          :key="holiday.date"
          class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <div>
            <p class="text-sm font-semibold text-slate-900">{{ formatDateZh(holiday.date) }}</p>
            <p v-if="holiday.note" class="text-xs text-slate-500">{{ holiday.note }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            :disabled="deletingHolidayDate === holiday.date"
            @click="removeHoliday(holiday.date)"
          >
            {{ deletingHolidayDate === holiday.date ? "刪除中..." : "刪除" }}
          </button>
        </li>
      </ul>
    </div>

    <p v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
      {{ successMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";
import { useAuthStore } from "../stores/auth";
import { getTodayText } from "../stores/rental";
import type { GlobalPauseRange, Holiday } from "../types/rental";

const authStore = useAuthStore();

const holidays = ref<Holiday[]>([]);
const globalPauses = ref<GlobalPauseRange[]>([]);
const holidayLoading = ref(false);
const globalPauseLoading = ref(false);
const holidaySubmitting = ref(false);
const globalPauseSubmitting = ref(false);
const deletingHolidayDate = ref("");
const deletingGlobalPauseId = ref("");
const errorMessage = ref("");
const successMessage = ref("");
const todayText = getTodayText();

const holidayForm = reactive({
  date: "",
  note: "",
});

const globalPauseForm = reactive({
  startDate: "",
  endDate: "",
  note: "",
});

function formatDateZh(value: string): string {
  const [year, month, day] = String(value || "").split("-");
  if (!year || !month || !day) return value;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function isActiveToday(pause: GlobalPauseRange): boolean {
  return pause.startDate <= todayText && pause.endDate >= todayText;
}

function clearMessages() {
  errorMessage.value = "";
  successMessage.value = "";
}

async function loadHolidays() {
  holidayLoading.value = true;
  try {
    holidays.value = await sheetsApi.fetchHolidays();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "讀取國定假日失敗。";
  } finally {
    holidayLoading.value = false;
  }
}

async function loadGlobalPauses() {
  globalPauseLoading.value = true;
  try {
    globalPauses.value = await sheetsApi.fetchGlobalPauseRanges();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "讀取全校暫停區間失敗。";
  } finally {
    globalPauseLoading.value = false;
  }
}

async function submitAddHoliday() {
  clearMessages();
  if (!holidayForm.date) {
    errorMessage.value = "請選擇國定假日日期。";
    return;
  }
  holidaySubmitting.value = true;
  try {
    await sheetsApi.createHoliday({
      operatorAccount: authStore.staffAccount,
      date: holidayForm.date,
      note: holidayForm.note,
    });
    successMessage.value = `已新增國定假日：${formatDateZh(holidayForm.date)}`;
    holidayForm.date = "";
    holidayForm.note = "";
    await loadHolidays();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "新增國定假日失敗。";
  } finally {
    holidaySubmitting.value = false;
  }
}

async function removeHoliday(date: string) {
  clearMessages();
  deletingHolidayDate.value = date;
  try {
    await sheetsApi.deleteHoliday({
      operatorAccount: authStore.staffAccount,
      date,
    });
    successMessage.value = `已刪除國定假日：${formatDateZh(date)}`;
    await loadHolidays();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "刪除國定假日失敗。";
  } finally {
    deletingHolidayDate.value = "";
  }
}

async function submitAddGlobalPause() {
  clearMessages();
  if (!globalPauseForm.startDate || !globalPauseForm.endDate) {
    errorMessage.value = "請完整填寫暫停區間的開始與結束日期。";
    return;
  }
  if (globalPauseForm.endDate < globalPauseForm.startDate) {
    errorMessage.value = "結束日期不可早於開始日期。";
    return;
  }
  globalPauseSubmitting.value = true;
  try {
    await sheetsApi.createGlobalPauseRange({
      operatorAccount: authStore.staffAccount,
      startDate: globalPauseForm.startDate,
      endDate: globalPauseForm.endDate,
      note: globalPauseForm.note,
    });
    successMessage.value = `已新增全校暫停區間：${formatDateZh(globalPauseForm.startDate)} - ${formatDateZh(globalPauseForm.endDate)}`;
    globalPauseForm.startDate = "";
    globalPauseForm.endDate = "";
    globalPauseForm.note = "";
    await loadGlobalPauses();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "新增全校暫停區間失敗。";
  } finally {
    globalPauseSubmitting.value = false;
  }
}

async function removeGlobalPause(id: string) {
  clearMessages();
  deletingGlobalPauseId.value = id;
  try {
    await sheetsApi.deleteGlobalPauseRange({
      operatorAccount: authStore.staffAccount,
      id,
    });
    successMessage.value = "已刪除全校暫停區間。";
    await loadGlobalPauses();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "刪除全校暫停區間失敗。";
  } finally {
    deletingGlobalPauseId.value = "";
  }
}

onMounted(() => {
  void Promise.all([loadHolidays(), loadGlobalPauses()]);
});
</script>
