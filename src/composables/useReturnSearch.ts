import { computed, ref, type Ref } from "vue";
import { useRentalStore, type ReturnSearchRecord } from "../stores/rental";

interface SubmitFeedbackActions {
	startLoading: (loadingText: string) => void;
	showSuccess: (title: string, message: string) => void;
	showError: (title: string, message: string) => void;
}

interface UseReturnSearchOptions {
	isSubmitting: Ref<boolean>;
	onSubmitted: () => void;
	syncDataVersion: () => Promise<void>;
}

export function useReturnSearch(submitFeedback: SubmitFeedbackActions, options: UseReturnSearchOptions) {
	const rentalStore = useRentalStore();
	const returnSearchId = ref("");
	const returnSearchError = ref("");
	const returnResults = ref<ReturnSearchRecord[]>([]);
	const selectedReturnIds = ref<string[]>([]);
	const returnSearchLoading = ref(false);

	const panelProps = computed(() => ({
		returnSearchLoading: returnSearchLoading.value,
		returnSearchError: returnSearchError.value,
		returnResults: returnResults.value,
		submitting: options.isSubmitting.value,
	}));

	async function searchReturn() {
		if (returnSearchLoading.value) return;
		returnSearchError.value = "";
		returnResults.value = [];
		selectedReturnIds.value = [];
		if (!returnSearchId.value) {
			returnSearchError.value = "請輸入學號。";
			return;
		}
		returnSearchLoading.value = true;
		try {
			await rentalStore.loadRecords();
			const results = rentalStore.getRecordsByStudentId(returnSearchId.value);
			if (results.length === 0) {
				returnSearchError.value = "查無此學號的租借中紀錄。";
				return;
			}
			returnResults.value = results;
		} finally {
			returnSearchLoading.value = false;
		}
	}

	async function submitReturn() {
		if (selectedReturnIds.value.length === 0) return;
		submitFeedback.startLoading("正在送出歸還申請…");

		try {
			const recordsToSubmit = selectedReturnIds.value
				.map((recordId) => returnResults.value.find((record) => record.id === recordId))
				.filter((record): record is ReturnSearchRecord => record !== undefined && !record.returnPending);

			await Promise.all(
				recordsToSubmit.map((record) =>
					rentalStore.submitReturnApplication({
						studentId: record.studentId,
						studentName: record.studentName,
						studentPhone: record.studentPhone,
						studentEmail: record.studentEmail,
						recordId: record.id,
					}),
				),
			);

			options.onSubmitted();
			returnResults.value = [];
			selectedReturnIds.value = [];
			returnSearchId.value = "";
			submitFeedback.showSuccess("送出成功", `已送出 ${recordsToSubmit.length} 筆歸還申請。`);
			void options.syncDataVersion();
		} catch (e) {
			const message = e instanceof Error ? e.message : "送出失敗，請稍後再試。";
			submitFeedback.showError("送出失敗", message);
		}
	}

	return {
		returnSearchId,
		returnSearchError,
		returnResults,
		selectedReturnIds,
		returnSearchLoading,
		panelProps,
		searchReturn,
		submitReturn,
	};
}
