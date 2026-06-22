import type { BorrowRecord } from "../types/rental";
import { getTodayText } from "./date";

export const OVERDUE_BORROW_BLOCK_MESSAGE =
	"您目前有逾期或未準時歸還的借用紀錄，暫無法提出借用申請。請洽詢服務台解除限制。";

export function isOverdue(record: BorrowRecord): boolean {
	const today = getTodayText();
	return record.status === "租借中" && record.expectedReturnAt.slice(0, 10) < today;
}

export function wasReturnedLate(record: BorrowRecord): boolean {
	if (record.status !== "已歸還" || !record.returnedAt) return false;
	return record.returnedAt.slice(0, 10) > record.expectedReturnAt.slice(0, 10);
}

export function hasOverdueBorrowRestriction(record: BorrowRecord): boolean {
	return isOverdue(record) || wasReturnedLate(record);
}

// 違規紀錄的判定基準日：逾期取應還日、晚還取實際歸還日。
function violationReferenceDate(record: BorrowRecord): string {
	if (isOverdue(record)) return record.expectedReturnAt.slice(0, 10);
	if (wasReturnedLate(record)) return (record.returnedAt ?? "").slice(0, 10);
	return "";
}

// blockStartDate：解鎖紀錄的「開始封鎖日期」。違規基準日 <= 此日期者視為已被解鎖（不計入）；
// 之後的新違規才會再次封鎖。未解鎖者傳空字串，任何違規皆生效。
export function studentHasOverdueBorrowRestriction(
	studentId: string,
	recordList: BorrowRecord[],
	blockStartDateByStudent?: Record<string, string>,
): boolean {
	const normalizedId = studentId.trim();
	if (!normalizedId) return false;
	const blockStartDate = blockStartDateByStudent?.[normalizedId] ?? "";
	return recordList.some((record) => {
		if (record.studentId !== normalizedId) return false;
		if (!hasOverdueBorrowRestriction(record)) return false;
		return violationReferenceDate(record) > blockStartDate;
	});
}
