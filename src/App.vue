<template>
	<div class="min-h-screen bg-slate-50 text-slate-800">
		<header class="bg-slate-900 text-white shadow-md">
			<div class="mx-auto flex w-full max-w-6xl items-start justify-between gap-3 px-4 py-4 sm:px-6">
				<div>
					<h1 class="text-xl font-bold sm:text-2xl">住宿書院管理系統</h1>
					<p class="mt-1 text-sm text-slate-300">
						{{ authStore.isStaffLoggedIn ? "管理介面" : "借用登記介面" }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						v-if="!authStore.isStaffLoggedIn"
						type="button"
						class="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:scale-[0.99] touch-manipulation"
						@click="authStore.openStaffLoginModal"
					>
						職員登入
					</button>
					<button
						v-else
						type="button"
						class="rounded-xl border border-slate-500 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.99] touch-manipulation"
						@click="handleStaffLogout"
					>
						{{ authStore.staffName || authStore.staffAccount }} 登出
					</button>
				</div>
			</div>
		</header>
		<main class="mx-auto w-full max-w-6xl p-4 sm:p-6">
			<RouterView />
		</main>
		<StaffLoginModal />
	</div>
</template>

<script setup lang="ts">
import { RouterView, useRouter } from "vue-router";
import StaffLoginModal from "./components/StaffLoginModal.vue";
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();
const router = useRouter();

function handleStaffLogout() {
	authStore.logoutStaff();
	router.push({ name: "register" });
}
</script>
