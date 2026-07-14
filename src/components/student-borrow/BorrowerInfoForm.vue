<template>
	<section class="pb-1">
		<h3 class="text-sm font-semibold text-slate-800">【步驟四】填寫借用資料</h3>
		<div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">學號/員編</span>
				<input v-model.trim="form.studentId" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
			</label>
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">姓名</span>
				<input v-model.trim="form.studentName" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
			</label>
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">聯絡電話</span>
				<input v-model.trim="form.studentPhone" type="tel" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
			</label>
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">電子郵件</span>
				<input v-model.trim="form.studentEmail" type="email" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
			</label>
			<label class="space-y-1 text-sm text-slate-700 md:col-span-2">
				<span class="font-medium">借用團體</span>
				<input
					v-model.trim="form.borrowerGroup"
					class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
					placeholder="課程／服學／小組／家族／社團名稱"
				/>
			</label>
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">負責導師（選填）</span>
				<input v-model.trim="form.mentorName" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
			</label>
			<label class="space-y-1 text-sm text-slate-700">
				<span class="font-medium">活動名稱</span>
				<input v-model.trim="form.activityName" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
			</label>
		</div>
		<p v-if="form.studentId && isStudentBorrowBlocked" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
			{{ OVERDUE_BORROW_BLOCK_MESSAGE }}
		</p>
		<button
			type="button"
			:disabled="submitDisabled"
			class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
			@click="emit('submit')"
		>
			送出
		</button>
	</section>
</template>

<script setup lang="ts">
import type { BorrowFormState } from "../../types/borrowForm";
import { OVERDUE_BORROW_BLOCK_MESSAGE } from "../../utils/borrowRestrictions";

defineProps<{
	form: BorrowFormState;
	isStudentBorrowBlocked: boolean;
	submitDisabled: boolean;
}>();

const emit = defineEmits<{
	submit: [];
}>();
</script>
