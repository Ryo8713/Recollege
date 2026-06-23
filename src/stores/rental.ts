import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { sheetsApi } from "../services/sheetsApi";
import { useAssetsStore } from "./assets";
import { getTodayText } from "../utils/date";
import {
    hasOverdueBorrowRestriction,
    isOverdue,
    OVERDUE_BORROW_BLOCK_MESSAGE,
    wasReturnedLate,
} from "../utils/borrowRestrictions";
import type { BorrowApplication, BorrowRecord, StudentBlock } from "../types/rental";

export interface ReturnSearchRecord extends BorrowRecord {
    returnPending: boolean;
}

export {
    hasOverdueBorrowRestriction,
    isOverdue,
    OVERDUE_BORROW_BLOCK_MESSAGE,
    wasReturnedLate,
} from "../utils/borrowRestrictions";

export const useRentalStore = defineStore("rental", () => {
    const assetsStore = useAssetsStore();

    const applications = ref<BorrowApplication[]>([]);
    const records = ref<BorrowRecord[]>([]);
    const studentBlocks = ref<StudentBlock[]>([]);
    const loading = ref(false);
    const loadError = ref("");
    const loadedApplicationsAt = ref(0);
    const loadedRecordsAt = ref(0);
    const loadedBlocksAt = ref(0);
    const inFlightApplicationsLoad = ref<Promise<void> | null>(null);
    const inFlightRecordsLoad = ref<Promise<void> | null>(null);
    const inFlightBlocksLoad = ref<Promise<void> | null>(null);
    const LOAD_TTL_MS = 60 * 1000;
    const reviewError = ref("");
    const reviewingApplicationIds = ref<string[]>([]);

    const pendingApplications = computed(() =>
        applications.value.filter((a) => a.status === "待審核"),
    );
    const activeRecords = computed(() => records.value.filter((r) => r.status === "租借中"));
    const inProgressRecords = computed(() => {
        const statusOrder: Partial<Record<BorrowRecord["status"], number>> = { 租借中: 0, 待生效: 1 };
        return records.value
            .filter((r) => r.status === "租借中" || r.status === "待生效")
            .sort((a, b) => {
                const dateDiff = a.borrowedAt.localeCompare(b.borrowedAt);
                if (dateDiff !== 0) return dateDiff;
                return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
            });
    });
    const overdueRecords = computed(() => activeRecords.value.filter((r) => isOverdue(r)));

    // 封鎖名單學號集合，供快速查詢。
    const blockedStudentIds = computed(() => {
        const set = new Set<string>();
        for (const block of studentBlocks.value) {
            const id = block.studentId.trim();
            if (id) set.add(id);
        }
        return set;
    });

    function isStudentBorrowRestricted(studentId: string): boolean {
        return blockedStudentIds.value.has(studentId.trim());
    }

    function beginReview(applicationId: string) {
        if (!reviewingApplicationIds.value.includes(applicationId)) {
            reviewingApplicationIds.value.push(applicationId);
        }
    }

    function endReview(applicationId: string) {
        reviewingApplicationIds.value = reviewingApplicationIds.value.filter((id) => id !== applicationId);
    }

    function isReviewing(applicationId: string): boolean {
        return reviewingApplicationIds.value.includes(applicationId);
    }

    function setAssetStatusesLocally(assetIds: string[], nextStatus: "可租借" | "已借出") {
        assetIds.forEach((id) => assetsStore.setAssetStatus(id, nextStatus));
    }

    function shouldLoadByTimestamp(loadedAt: number, force = false): boolean {
        if (force) return true;
        if (!loadedAt) return true;
        return Date.now() - loadedAt > LOAD_TTL_MS;
    }

    async function loadApplications(options?: { force?: boolean }) {
        const force = Boolean(options?.force);
        if (inFlightApplicationsLoad.value) {
            return inFlightApplicationsLoad.value;
        }
        if (!shouldLoadByTimestamp(loadedApplicationsAt.value, force)) {
            return;
        }

        loading.value = true;
        loadError.value = "";
        inFlightApplicationsLoad.value = (async () => {
            try {
                applications.value = await sheetsApi.fetchBorrowApplications();
                loadedApplicationsAt.value = Date.now();
            } catch (error) {
                loadError.value = error instanceof Error ? error.message : "讀取資料失敗";
            } finally {
                loading.value = false;
                inFlightApplicationsLoad.value = null;
            }
        })();
        return inFlightApplicationsLoad.value;
    }

    async function loadRecords(options?: { force?: boolean }) {
        const force = Boolean(options?.force);
        if (inFlightRecordsLoad.value) {
            return inFlightRecordsLoad.value;
        }
        if (!shouldLoadByTimestamp(loadedRecordsAt.value, force)) {
            return;
        }

        loading.value = true;
        loadError.value = "";
        inFlightRecordsLoad.value = (async () => {
            try {
                records.value = await sheetsApi.fetchBorrowRecords();
                loadedRecordsAt.value = Date.now();
            } catch (error) {
                loadError.value = error instanceof Error ? error.message : "讀取資料失敗";
            } finally {
                loading.value = false;
                inFlightRecordsLoad.value = null;
            }
        })();
        return inFlightRecordsLoad.value;
    }

    async function loadStudentBlocks(options?: { force?: boolean }) {
        const force = Boolean(options?.force);
        if (inFlightBlocksLoad.value) {
            return inFlightBlocksLoad.value;
        }
        if (!shouldLoadByTimestamp(loadedBlocksAt.value, force)) {
            return;
        }

        inFlightBlocksLoad.value = (async () => {
            try {
                studentBlocks.value = await sheetsApi.fetchStudentBlocks();
                loadedBlocksAt.value = Date.now();
            } catch {
                // 封鎖名單讀取失敗時不阻擋借用流程，僅退回為「無封鎖」狀態。
            } finally {
                inFlightBlocksLoad.value = null;
            }
        })();
        return inFlightBlocksLoad.value;
    }

    async function addStudentBlock(payload: { operatorAccount: string; studentId: string; note?: string }) {
        await sheetsApi.createStudentBlock(payload);
        await loadStudentBlocks({ force: true });
    }

    async function removeStudentBlock(payload: { operatorAccount: string; studentId: string }) {
        await sheetsApi.deleteStudentBlock(payload);
        await loadStudentBlocks({ force: true });
    }

    async function submitBorrowApplication(payload: {
        studentId: string;
        studentName: string;
        studentPhone: string;
        studentEmail: string;
        borrowerGroup: string;
        mentorName: string;
        activityName: string;
        itemName: string;
        assetIds: string[];
        borrowedAt: string;
        expectedReturnAt: string;
    }) {
        await Promise.all([loadRecords(), loadStudentBlocks()]);
        if (isStudentBorrowRestricted(payload.studentId)) {
            throw new Error(OVERDUE_BORROW_BLOCK_MESSAGE);
        }

        const appPayload = { ...payload, type: "借用申請" as const };
        const { applicationId } = await sheetsApi.createBorrowApplication(appPayload);

        const application: BorrowApplication = {
        id: applicationId,
        type: "借用申請",
        ...payload,
        status: "待審核",
        createdAt: new Date().toISOString(),
        };
        applications.value.unshift(application);
    }

    async function approveApplication(applicationId: string, staffName: string) {
        const app = applications.value.find((a) => a.id === applicationId);
        if (!app || app.status !== "待審核" || isReviewing(applicationId)) return;

        reviewError.value = "";
        beginReview(applicationId);

        const previousStatus = app.status;
        const previousReviewedBy = app.reviewedBy;
        const previousReviewedAt = app.reviewedAt;
        const previousRecordId = app.recordId;
        const previousRejectionReason = app.rejectionReason;
        const reviewedAt = getTodayText();
        const shouldBeActiveNow = app.borrowedAt.slice(0, 10) <= reviewedAt;
        const previousAssetStatuses = app.assetIds.map((assetId) => {
            const asset = assetsStore.assets.find((a) => a.id === assetId);
            return { assetId, status: asset?.status };
        });

        let optimisticRecord: BorrowRecord | null = null;
        let previousReturnRecordState: Pick<BorrowRecord, "status" | "returnedAt" | "returnRequestStatus"> | null = null;

        app.status = "已核准";
        app.reviewedBy = staffName;
        app.reviewedAt = reviewedAt;
        app.rejectionReason = "";

        if (app.type === "借用申請") {
            optimisticRecord = {
                id: `pending-rec-${Date.now()}`,
                studentId: app.studentId,
                studentName: app.studentName,
                studentPhone: app.studentPhone,
                studentEmail: app.studentEmail,
                borrowerGroup: app.borrowerGroup,
                mentorName: app.mentorName,
                activityName: app.activityName,
                itemName: app.itemName,
                assetIds: app.assetIds,
                borrowedAt: app.borrowedAt,
                expectedReturnAt: app.expectedReturnAt,
                status: shouldBeActiveNow ? "租借中" : "待生效",
                returnRequestStatus: "",
            };
            records.value.unshift(optimisticRecord);
            if (shouldBeActiveNow) {
                setAssetStatusesLocally(app.assetIds, "已借出");
            }
        }

        if (app.type === "歸還申請" && app.recordId) {
            const record = records.value.find((r) => r.id === app.recordId);
            if (record) {
                previousReturnRecordState = {
                    status: record.status,
                    returnedAt: record.returnedAt,
                    returnRequestStatus: record.returnRequestStatus,
                };
                record.status = "已歸還";
                record.returnedAt = reviewedAt;
                record.returnRequestStatus = "";
                setAssetStatusesLocally(record.assetIds, "可租借");
            }
        }

        try {
            const result = await sheetsApi.reviewBorrowApplication({
                applicationId,
                action: "approve",
                staffName,
            });
            if (app.type === "借用申請" && optimisticRecord && result.recordId) {
                optimisticRecord.id = result.recordId;
                app.recordId = result.recordId;
            }
        } catch (error) {
            app.status = previousStatus;
            app.reviewedBy = previousReviewedBy;
            app.reviewedAt = previousReviewedAt;
            app.recordId = previousRecordId;
            app.rejectionReason = previousRejectionReason;

            if (optimisticRecord) {
                records.value = records.value.filter((r) => r !== optimisticRecord);
            }

            if (app.type === "歸還申請" && app.recordId && previousReturnRecordState) {
                const record = records.value.find((r) => r.id === app.recordId);
                if (record) {
                    record.status = previousReturnRecordState.status;
                    record.returnedAt = previousReturnRecordState.returnedAt;
                    record.returnRequestStatus = previousReturnRecordState.returnRequestStatus;
                }
            }

            previousAssetStatuses.forEach(({ assetId, status }) => {
                if (status) assetsStore.setAssetStatus(assetId, status);
            });

            reviewError.value = error instanceof Error ? error.message : "審核失敗，請稍後再試。";
        } finally {
            endReview(applicationId);
        }
    }

    async function rejectApplication(applicationId: string, staffName: string, rejectionReason = "") {
        const app = applications.value.find((a) => a.id === applicationId);
        if (!app || app.status !== "待審核" || isReviewing(applicationId)) return;

        reviewError.value = "";
        beginReview(applicationId);

        const previousStatus = app.status;
        const previousReviewedBy = app.reviewedBy;
        const previousReviewedAt = app.reviewedAt;
        const previousRejectionReason = app.rejectionReason;
        const previousReturnPendingStatus =
            app.type === "歸還申請" && app.recordId
                ? records.value.find((r) => r.id === app.recordId)?.returnRequestStatus
                : undefined;

        app.status = "已駁回";
        app.reviewedBy = staffName;
        app.reviewedAt = getTodayText();
        app.rejectionReason = rejectionReason.trim();
        if (app.type === "歸還申請" && app.recordId) {
            const record = records.value.find((r) => r.id === app.recordId);
            if (record) {
                record.returnRequestStatus = "";
            }
        }

        try {
            await sheetsApi.reviewBorrowApplication({
                applicationId,
                action: "reject",
                staffName,
                rejectionReason: rejectionReason.trim(),
            });
        } catch (error) {
            app.status = previousStatus;
            app.reviewedBy = previousReviewedBy;
            app.reviewedAt = previousReviewedAt;
            app.rejectionReason = previousRejectionReason;
            if (app.type === "歸還申請" && app.recordId) {
                const record = records.value.find((r) => r.id === app.recordId);
                if (record) {
                    record.returnRequestStatus = previousReturnPendingStatus;
                }
            }
            reviewError.value = error instanceof Error ? error.message : "審核失敗，請稍後再試。";
        } finally {
            endReview(applicationId);
        }
    }

    function getRecordsByStudentId(studentId: string): ReturnSearchRecord[] {
        return records.value
            .filter((r) => r.studentId === studentId && r.status === "租借中")
            .map((record) => ({
                ...record,
                returnPending: record.returnRequestStatus === "待審核",
            }));
    }

    async function updateRecordExpectedReturnAt(payload: {
        operatorAccount: string;
        recordId: string;
        expectedReturnAt: string;
    }) {
        const { expectedReturnAt } = await sheetsApi.updateBorrowRecordExpectedReturnAt(payload);
        const record = records.value.find((r) => r.id === payload.recordId);
        if (record) {
            record.expectedReturnAt = expectedReturnAt;
        }
        await loadRecords({ force: true });
    }

    async function submitReturnApplication(payload: {
        studentId: string;
        studentName: string;
        studentPhone: string;
        studentEmail: string;
        recordId: string;
    }) {
        const record = records.value.find((r) => r.id === payload.recordId);
        if (!record) return;
        if (record.returnRequestStatus === "待審核") {
            throw new Error("此項目已有待審核歸還申請，請等待職員審核。");
        }

        const appPayload = {
            type: "歸還申請" as const,
            studentId: payload.studentId,
            studentName: payload.studentName,
            studentPhone: payload.studentPhone,
            studentEmail: payload.studentEmail,
            borrowerGroup: record.borrowerGroup,
            mentorName: record.mentorName,
            activityName: record.activityName,
            itemName: record.itemName,
            assetIds: record.assetIds,
            borrowedAt: record.borrowedAt,
            expectedReturnAt: record.expectedReturnAt,
            recordId: payload.recordId,
        };
        const { applicationId } = await sheetsApi.createBorrowApplication(appPayload);

        const app: BorrowApplication = {
        id: applicationId,
        type: "歸還申請",
        studentId: payload.studentId,
        studentName: payload.studentName,
        studentPhone: payload.studentPhone,
        studentEmail: payload.studentEmail,
        borrowerGroup: record.borrowerGroup,
        mentorName: record.mentorName,
        activityName: record.activityName,
        itemName: record.itemName,
        assetIds: record.assetIds,
        borrowedAt: record.borrowedAt,
        expectedReturnAt: record.expectedReturnAt,
        recordId: payload.recordId,
        status: "待審核",
        createdAt: new Date().toISOString(),
        };
        applications.value.unshift(app);
        record.returnRequestStatus = "待審核";
    }

    return {
        applications,
        records,
        studentBlocks,
        loading,
        loadError,
        loadedApplicationsAt,
        loadedRecordsAt,
        reviewError,
        reviewingApplicationIds,
        pendingApplications,
        activeRecords,
        inProgressRecords,
        overdueRecords,
        blockedStudentIds,
        isOverdue,
        wasReturnedLate,
        hasOverdueBorrowRestriction,
        isStudentBorrowRestricted,
        OVERDUE_BORROW_BLOCK_MESSAGE,
        loadApplications,
        loadRecords,
        loadStudentBlocks,
        addStudentBlock,
        removeStudentBlock,
        submitBorrowApplication,
        updateRecordExpectedReturnAt,
        approveApplication,
        rejectApplication,
        isReviewing,
        getRecordsByStudentId,
        submitReturnApplication,
    };
});
