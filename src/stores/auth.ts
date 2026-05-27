import { reactive, ref } from "vue";
import { defineStore } from "pinia";
import { sheetsApi, hasApiBaseUrl } from "../services/sheetsApi";
import type { StaffRole } from "../types/rental";

const STAFF_ACCOUNT = "admin";
const STAFF_PASSWORD = "1234";

export const useAuthStore = defineStore("auth", () => {
	const isStaffLoggedIn = ref(false);
	const staffAccount = ref("");
	const staffRole = ref<StaffRole>("staff");
	const showStaffLoginModal = ref(false);
	const staffLoginError = ref("");
	const loginLoading = ref(false);

	const staffLoginForm = reactive({
		account: "",
		password: "",
	});

	function openStaffLoginModal() {
		staffLoginError.value = "";
		staffLoginForm.account = "";
		staffLoginForm.password = "";
		showStaffLoginModal.value = true;
	}

	function closeStaffLoginModal() {
		showStaffLoginModal.value = false;
	}

	async function loginStaff(): Promise<boolean> {
		loginLoading.value = true;
		try {
			if (hasApiBaseUrl()) {
				const result = await sheetsApi.loginStaff({
					account: staffLoginForm.account.trim(),
					password: staffLoginForm.password,
				});
				isStaffLoggedIn.value = true;
				staffAccount.value = result.account;
				staffRole.value = result.role;
			} else {
				const valid =
					staffLoginForm.account === STAFF_ACCOUNT && staffLoginForm.password === STAFF_PASSWORD;
				if (!valid) {
					staffLoginError.value = "帳號或密碼錯誤，請重新輸入。";
					return false;
				}
				isStaffLoggedIn.value = true;
				staffAccount.value = staffLoginForm.account;
				staffRole.value = "admin";
			}
			showStaffLoginModal.value = false;
			staffLoginError.value = "";
			return true;
		} catch (error) {
			staffLoginError.value = error instanceof Error ? error.message : "登入失敗，請稍後再試。";
			return false;
		} finally {
			loginLoading.value = false;
		}
	}

	async function createStaffAccount(payload: { account: string; password: string }) {
		if (!isStaffLoggedIn.value) {
			throw new Error("請先登入職員帳號。");
		}
		if (!hasApiBaseUrl()) {
			throw new Error("尚未設定 API，無法新增職員帳號。");
		}
		return sheetsApi.createStaffAccount({
			operatorAccount: staffAccount.value,
			account: payload.account,
			password: payload.password,
		});
	}

	function logoutStaff() {
		isStaffLoggedIn.value = false;
		staffAccount.value = "";
		staffRole.value = "staff";
	}

	return {
		isStaffLoggedIn,
		staffAccount,
		staffRole,
		showStaffLoginModal,
		staffLoginError,
		loginLoading,
		staffLoginForm,
		openStaffLoginModal,
		closeStaffLoginModal,
		loginStaff,
		createStaffAccount,
		logoutStaff,
	};
});
