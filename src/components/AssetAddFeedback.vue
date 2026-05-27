<template>
  <!-- 載入中 -->
  <div
    v-if="phase === 'loading'"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    role="alertdialog"
    aria-busy="true"
    aria-label="載入中"
  >
    <section class="flex w-full max-w-sm flex-col items-center rounded-2xl bg-white px-8 py-10 shadow-xl">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900"
        aria-hidden="true"
      />
      <p class="mt-5 text-center text-base font-semibold text-slate-900">{{ loadingText }}</p>
      <p class="mt-1 text-center text-sm text-slate-500">請稍候，正在寫入 Google 試算表…</p>
    </section>
  </div>

  <!-- 結果 -->
  <div
    v-else-if="phase === 'result'"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    role="alertdialog"
    :aria-labelledby="resultTitleId"
    @click.self="emit('close')"
  >
    <section class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <div class="flex flex-col items-center text-center">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-full"
          :class="success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
        >
          <span v-if="success" class="text-2xl font-bold" aria-hidden="true">✓</span>
          <span v-else class="text-2xl font-bold" aria-hidden="true">✕</span>
        </div>
        <h3 :id="resultTitleId" class="mt-4 text-lg font-bold text-slate-900">{{ title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ message }}</p>
      </div>
      <button
        type="button"
        class="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99] touch-manipulation"
        :class="success ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'"
        @click="emit('close')"
      >
        確定
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

defineProps<{
  phase: "loading" | "result" | null;
  loadingText?: string;
  success?: boolean;
  title?: string;
  message?: string;
}>();

const emit = defineEmits<{ close: [] }>();

const resultTitleId = computed(() => "asset-add-result-title");
</script>
