import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { useRentalStore } from "../stores/rental";
import type { BorrowConfirmSummary, BorrowFormState } from "../types/borrowForm";
import { EMPTY_BORROW_FORM } from "../types/borrowForm";
import type { Asset } from "../types/rental";
import { BORROW_LEAD_WORKING_DAYS, OVERDUE_BORROW_BLOCK_MESSAGE } from "../utils/borrowRestrictions";
import { formatDateZh, isWorkingDayText } from "../utils/date";
import { formatHourLabel } from "../utils/venueHours";

interface SubmitFeedbackActions {
	startLoading: (loadingText: string) => void;
	showSuccess: (title: string, message: string) => void;
	showError: (title: string, message: string) => void;
}

interface UseBorrowSubmitParams {
	form: BorrowFormState;
	borrowError: Ref<string>;
	rentalStore: ReturnType<typeof useRentalStore>;
	assets: Ref<Asset[]>;
	submitFeedback: SubmitFeedbackActions;
	syncDataVersion: () => Promise<void>;
	holidayDates: Ref<Set<string>>;
	isStudentBorrowBlocked: ComputedRef<boolean>;
	selectedAssetId: Ref<string>;
	selectedAssetType: Ref<Asset["type"] | "">;
	availableReturnDates: Ref<string[]>;
	availabilityLoading: Ref<boolean>;
	clearAvailabilityCaches: () => void;
	ensureBlockedRangesLoaded: (force?: boolean) => Promise<boolean>;
	resetVenueSlots: () => void;
	earliestBorrowDate: ComputedRef<string>;
	isVenueSelected: ComputedRef<boolean>;
	selectedVenueSlotHours: Ref<number[]>;
	selectedVenueStartHour: ComputedRef<number | null>;
	selectedVenueEndHour: ComputedRef<number | null>;
	selectedVenueSlotLabels: ComputedRef<string[]>;
	venueDurationHours: ComputedRef<number>;
	venueStartHours: Ref<number[]>;
	hasNoAvailableReturnDate: ComputedRef<boolean>;
}

export function useBorrowSubmit(params: UseBorrowSubmitParams) {
	const {
		form,
		borrowError,
		rentalStore,
		assets,
		submitFeedback,
		syncDataVersion,
		holidayDates,
		isStudentBorrowBlocked,
		selectedAssetId,
		selectedAssetType,
		availableReturnDates,
		availabilityLoading,
		clearAvailabilityCaches,
		ensureBlockedRangesLoaded,
		resetVenueSlots,
		earliestBorrowDate,
		isVenueSelected,
		selectedVenueSlotHours,
		selectedVenueStartHour,
		selectedVenueEndHour,
		selectedVenueSlotLabels,
		venueDurationHours,
		venueStartHours,
		hasNoAvailableReturnDate,
	} = params;

	const showBorrowConfirmModal = ref(false);
	const borrowConfirmSummary = ref<BorrowConfirmSummary | null>(null);

	const selectedAssetName = computed(() => {
		const asset = assets.value.find((item) => item.id === selectedAssetId.value);
		return asset?.name ?? "";
	});

	const borrowDurationDays = computed(() => {
		if (!form.borrowedAt || !form.expectedReturnAt) return 0;
		const start = new Date(`${form.borrowedAt}T00:00:00`);
		const end = new Date(`${form.expectedReturnAt}T00:00:00`);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
		const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
		return diff > 0 ? diff : 0;
	});

	function resetBorrowForm() {
		Object.assign(form, EMPTY_BORROW_FORM);
	}

	function buildItemName(): string {
		if (!selectedAssetId.value || !selectedAssetName.value || !selectedAssetType.value) return "";
		const label = selectedAssetType.value === "venue" ? "空間" : "設備";
		return `${label}:${selectedAssetName.value}`;
	}

	function createBorrowConfirmSummary(): BorrowConfirmSummary {
		return {
			form: { ...form },
			selectedAssetName: selectedAssetName.value,
			isVenueSelected: isVenueSelected.value,
			selectedVenueSlotLabels: [...selectedVenueSlotLabels.value],
			venueDurationHours: venueDurationHours.value,
			borrowDurationDays: borrowDurationDays.value,
		};
	}

	function closeBorrowConfirmModal() {
		showBorrowConfirmModal.value = false;
		borrowConfirmSummary.value = null;
	}

	function validateBorrowBeforeSubmit(): boolean {
		if (!selectedAssetId.value) {
			borrowError.value = "請先選擇一項欲借用品項（空間或設備擇一）。";
			return false;
		}
		if (!form.studentId || !form.studentName || !form.studentPhone || !form.studentEmail) {
			borrowError.value = "請填寫完整的借用人資訊。";
			return false;
		}
		if (isStudentBorrowBlocked.value) {
			borrowError.value = OVERDUE_BORROW_BLOCK_MESSAGE;
			return false;
		}
		if (!form.borrowerGroup || !form.activityName) {
			borrowError.value = "請填寫借用團體與活動名稱。";
			return false;
		}
		if (!form.borrowedAt) {
			borrowError.value = "請先選擇借用日期。";
			return false;
		}
		if (form.borrowedAt < earliestBorrowDate.value) {
			borrowError.value = `因申請需約 ${BORROW_LEAD_WORKING_DAYS} 個工作天作業時間（申請當日不計入），最早可借用日期為 ${formatDateZh(earliestBorrowDate.value)}（已排除週末與國定假日）。`;
			return false;
		}
		if (!isVenueSelected.value && !isWorkingDayText(form.borrowedAt, holidayDates.value)) {
			borrowError.value = "設備借用日須為工作天（週末與國定假日不可借用）。";
			return false;
		}
		if (availabilityLoading.value) {
			borrowError.value = "可借項目仍在更新中，請稍候再送出。";
			return false;
		}
		if (isVenueSelected.value) {
			if (selectedVenueSlotHours.value.length === 0) {
				borrowError.value = "請選擇空間借用時段。";
				return false;
			}
			const availableStartHours = new Set(venueStartHours.value);
			if (selectedVenueSlotHours.value.some((hour) => !availableStartHours.has(hour))) {
				borrowError.value = "所選時段已開始或已不可借，請重新選擇時段。";
				return false;
			}
			return true;
		}
		if (hasNoAvailableReturnDate.value) {
			borrowError.value = "此品項在所選借用日期下無可歸還日期，請改選借用日期或項目。";
			return false;
		}
		if (!form.expectedReturnAt) {
			borrowError.value = "系統尚未計算出應歸還日期，請稍候或重新選擇借用日期。";
			return false;
		}
		return true;
	}

	function buildVenueTemporalPayload(): { borrowedAt: string; expectedReturnAt: string } | null {
		const startHour = selectedVenueStartHour.value;
		const endHour = selectedVenueEndHour.value;
		if (startHour == null || endHour == null) return null;
		return {
			borrowedAt: `${form.borrowedAt} ${formatHourLabel(startHour)}`,
			expectedReturnAt: `${form.borrowedAt} ${formatHourLabel(endHour)}`,
		};
	}

	async function submitBorrow() {
		borrowError.value = "";
		if (!validateBorrowBeforeSubmit()) {
			closeBorrowConfirmModal();
			return;
		}
		closeBorrowConfirmModal();

		const venuePayload = isVenueSelected.value ? buildVenueTemporalPayload() : null;
		if (isVenueSelected.value && !venuePayload) {
			borrowError.value = "請選擇空間借用時段。";
			return;
		}

		const borrowedAtPayload = venuePayload?.borrowedAt ?? form.borrowedAt;
		const expectedReturnAtPayload = venuePayload?.expectedReturnAt ?? form.expectedReturnAt;

		submitFeedback.startLoading("正在送出借用申請…");

		try {
			await rentalStore.submitBorrowApplication({
				studentId: form.studentId,
				studentName: form.studentName,
				studentPhone: form.studentPhone,
				studentEmail: form.studentEmail,
				borrowerGroup: form.borrowerGroup,
				mentorName: form.mentorName,
				activityName: form.activityName,
				itemName: buildItemName(),
				assetIds: [selectedAssetId.value],
				borrowedAt: borrowedAtPayload,
				expectedReturnAt: expectedReturnAtPayload,
			});
			clearAvailabilityCaches();
			void ensureBlockedRangesLoaded(true);
			selectedAssetId.value = "";
			selectedAssetType.value = "";
			availableReturnDates.value = [];
			resetVenueSlots();
			resetBorrowForm();
			submitFeedback.showSuccess("送出成功", "借用申請已送出。");
			void syncDataVersion();
		} catch (e) {
			borrowError.value = e instanceof Error ? e.message : "送出失敗，請稍後再試。";
			submitFeedback.showError("送出失敗", borrowError.value);
		}
	}

	function openBorrowConfirmModal() {
		borrowError.value = "";
		void Promise.all([rentalStore.loadRecords(), rentalStore.loadStudentBlocks()]).then(() => {
			if (!validateBorrowBeforeSubmit()) return;
			borrowConfirmSummary.value = createBorrowConfirmSummary();
			showBorrowConfirmModal.value = true;
		});
	}

	return {
		showBorrowConfirmModal,
		borrowConfirmSummary,
		closeBorrowConfirmModal,
		openBorrowConfirmModal,
		submitBorrow,
	};
}
