import { computed, reactive } from "vue";

export type SubmitFeedbackPhase = null | "loading" | "result";

export function useSubmitFeedback() {
	const feedback = reactive({
		phase: null as SubmitFeedbackPhase,
		loadingText: "",
		success: true,
		title: "",
		message: "",
	});

	const isSubmitting = computed(() => feedback.phase === "loading");

	function close(onlyIfLoadingText?: string) {
		if (onlyIfLoadingText !== undefined) {
			if (feedback.phase !== "loading" || feedback.loadingText !== onlyIfLoadingText) {
				return;
			}
		}
		feedback.phase = null;
	}

	function startLoading(loadingText: string) {
		feedback.phase = "loading";
		feedback.loadingText = loadingText;
	}

	function showSuccess(title: string, message: string) {
		feedback.phase = "result";
		feedback.success = true;
		feedback.title = title;
		feedback.message = message;
	}

	function showError(title: string, message: string) {
		feedback.phase = "result";
		feedback.success = false;
		feedback.title = title;
		feedback.message = message;
	}

	return {
		feedback,
		isSubmitting,
		close,
		startLoading,
		showSuccess,
		showError,
	};
}
