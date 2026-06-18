<template>
	<div
		v-if="authStore.showStaffLoginModal"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		@click.self="authStore.closeStaffLoginModal"
	>
		<section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
			<h3 class="text-lg font-bold text-slate-900">教職員登入</h3>
			<form class="mt-4 space-y-3" @submit.prevent="handleLogin">
				<input
				v-model="authStore.staffLoginForm.account"
				class="w-full rounded-lg border border-slate-300 px-3 py-2"
				placeholder="帳號"
				autocomplete="username"
				required
				/>
				<input
				v-model="authStore.staffLoginForm.password"
				class="w-full rounded-lg border border-slate-300 px-3 py-2"
				type="password"
				placeholder="密碼"
				autocomplete="current-password"
				required
				/>
				<p v-if="authStore.staffLoginError" class="text-sm font-semibold text-red-700">
				{{ authStore.staffLoginError }}
				</p>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
						:disabled="authStore.loginLoading"
						@click="authStore.closeStaffLoginModal"
					>
						取消
					</button>
					<button
						type="submit"
						class="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
						:disabled="authStore.loginLoading"
					>
						{{ authStore.loginLoading ? "登入中..." : "登入" }}
					</button>
				</div>
			</form>
		</section>
	</div>
</template>

<script setup lang="ts">
	import { watch } from "vue";
	import { useRouter } from "vue-router";
	import { useAuthStore } from "../stores/auth";
	import { useAssetsStore } from "../stores/assets";
	import { useRentalStore } from "../stores/rental";

	const authStore = useAuthStore();
	const assetsStore = useAssetsStore();
	const rentalStore = useRentalStore();
	const router = useRouter();

	async function handleLogin() {
		if (await authStore.loginStaff()) {
			router.push("/staff");
		}
	}

	watch(
		() => authStore.showStaffLoginModal,
		(isOpen) => {
			if (!isOpen) return;
			void Promise.all([
				assetsStore.loadAssets(),
				rentalStore.loadApplications(),
				rentalStore.loadRecords(),
			]).catch(() => {
				// Ignore prefetch errors; login flow should remain usable.
			});
		},
	);
</script>
