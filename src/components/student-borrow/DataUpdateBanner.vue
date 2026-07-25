<template>
	<div
		v-if="visible"
		class="fixed right-4 top-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-lg"
	>
		<div class="flex items-start justify-between gap-3">
			<p class="font-semibold">可借日期可能已變動，請重新整理。</p>
			<button
				type="button"
				class="-mr-1 rounded px-1.5 py-0.5 text-lg font-bold leading-none text-blue-700 transition hover:bg-blue-100"
				aria-label="關閉更新通知"
				@click="emit('dismiss')"
			>
				×
			</button>
		</div>
		<button
			type="button"
			class="mt-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
			:disabled="refreshing"
			@click="emit('refresh')"
		>
			{{ refreshing ? "更新中..." : "更新可借資料" }}
		</button>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	visible: boolean;
	refreshing: boolean;
}>();

const emit = defineEmits<{
	dismiss: [];
	refresh: [];
}>();
</script>
