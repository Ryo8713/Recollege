import { reactive, ref } from "vue";
import { defineStore } from "pinia";
import { sheetsApi } from "../services/sheetsApi";

export const useAuthStore = defineStore("auth", () => {
	const isStaffLoggedIn = ref(false);
	const staffAccount = ref("");
	const staffName = ref("");
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
			const result = await sheetsApi.loginStaff({
				account: staffLoginForm.account.trim(),
				password: staffLoginForm.password,
			});
			isStaffLoggedIn.value = true;
			staffAccount.value = result.account;
			staffName.value = result.name || result.account;
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

	async function createStaffAccount(payload: { account: string; name: string; password: string }) {
		if (!isStaffLoggedIn.value) {
			throw new Error("請先登入職員帳號。");
		}
		return sheetsApi.createStaffAccount({
			operatorAccount: staffAccount.value,
			account: payload.account,
			password: payload.password,
			name: payload.name
		});
	}

	function logoutStaff() {
		isStaffLoggedIn.value = false;
		staffAccount.value = "";
		staffName.value = "";
	}

	return {
		isStaffLoggedIn,
		staffAccount,
		staffName,
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
