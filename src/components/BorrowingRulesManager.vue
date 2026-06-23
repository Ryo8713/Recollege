<template>
  <div class="space-y-4">
    <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
      <p class="font-semibold">借用規則說明</p>
      <p class="mt-1 text-xs leading-relaxed text-amber-800">
        全校暫停區間，所有空間與設備不開放借用；國定假日會調整空間可借用時段（08:00–23:00），設備則於週末與國定假日不可借用或歸還。
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
            國定假日會讓空間改用假日可借時段（08:00–23:00）；平日為 17:00–23:00。設備借用與歸還日須為工作天（週末與國定假日不可）。
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

    <div
      v-if="authStore.staffRole === 'admin'"
      class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-bold text-slate-900">借用封鎖名單</h3>
          <p class="mt-1 text-xs text-slate-500">
            名單內的學號無法提出借用申請。每日自動掃描逾期紀錄並登記；管理員可手動新增或移除。僅限管理員操作。
          </p>
        </div>
        <span class="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
          封鎖 {{ studentBlocks.length }} 人
        </span>
      </div>

      <form class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[200px_1fr_auto]" @submit.prevent="submitAddBlock">
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">學號</span>
          <input
            v-model.trim="blockForm.studentId"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            placeholder="輸入要封鎖的學號"
            :disabled="Boolean(blocking)"
          />
        </label>
        <label class="space-y-1 text-sm text-slate-700">
          <span class="font-medium">備註（選填）</span>
          <input
            v-model.trim="blockForm.note"
            maxlength="60"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
            placeholder="例如：已通知當事人"
            :disabled="Boolean(blocking)"
          />
        </label>
        <div class="flex items-end">
          <button
            type="submit"
            class="w-full rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            :disabled="Boolean(blocking)"
          >
            {{ blocking ? "新增中..." : "新增封鎖" }}
          </button>
        </div>
      </form>

      <div class="mt-5">
        <p class="text-sm font-semibold text-slate-800">目前封鎖名單</p>
        <p v-if="blocksLoading" class="mt-2 text-sm text-slate-500">讀取中...</p>
        <p v-else-if="studentBlocks.length === 0" class="mt-2 text-sm text-slate-400">目前沒有被封鎖的學號。</p>
        <ul v-else class="mt-2 space-y-2">
          <li
            v-for="block in studentBlocks"
            :key="block.studentId"
            class="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">{{ block.studentId }}</p>
              <p class="text-xs text-slate-500">
                封鎖日：{{ formatDateZh(block.blockedAt) }}
                <span v-if="block.note"> · {{ block.note }}</span>
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
              :disabled="unblocking === block.studentId"
              @click="removeBlock(block.studentId)"
            >
              {{ unblocking === block.studentId ? "移除中..." : "解除封鎖" }}
            </button>
          </li>
        </ul>
      </div>
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
import { storeToRefs } from "pinia";
import { sheetsApi } from "../services/sheetsApi";
import { useAuthStore } from "../stores/auth";
import { useRentalStore } from "../stores/rental";
import { formatDateZh, getTodayText } from "../utils/date";
import type { GlobalPauseRange, Holiday } from "../types/rental";

const authStore = useAuthStore();
const rentalStore = useRentalStore();
const { studentBlocks } = storeToRefs(rentalStore);

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

const blockForm = reactive({
  studentId: "",
  note: "",
});
const blocking = ref("");
const unblocking = ref("");
const blocksLoading = ref(false);

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

async function submitAddBlock() {
  const id = blockForm.studentId.trim();
  clearMessages();
  if (!id) {
    errorMessage.value = "請輸入要封鎖的學號。";
    return;
  }
  blocking.value = id;
  try {
    await rentalStore.addStudentBlock({
      operatorAccount: authStore.staffAccount,
      studentId: id,
      note: blockForm.note,
    });
    successMessage.value = `已將學號 ${id} 加入封鎖名單。`;
    blockForm.studentId = "";
    blockForm.note = "";
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "新增封鎖失敗。";
  } finally {
    blocking.value = "";
  }
}

async function removeBlock(studentId: string) {
  clearMessages();
  unblocking.value = studentId;
  try {
    await rentalStore.removeStudentBlock({
      operatorAccount: authStore.staffAccount,
      studentId,
    });
    successMessage.value = `已解除學號 ${studentId} 的封鎖。`;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "解除封鎖失敗。";
  } finally {
    unblocking.value = "";
  }
}

async function loadBlocksData() {
  if (authStore.staffRole !== "admin") return;
  blocksLoading.value = true;
  try {
    await rentalStore.loadStudentBlocks({ force: true });
  } finally {
    blocksLoading.value = false;
  }
}

onMounted(() => {
  void Promise.all([loadHolidays(), loadGlobalPauses(), loadBlocksData()]);
});
</script>
