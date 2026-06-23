import type { BorrowRecord } from "../types/rental";
import { getTodayText } from "./date";

export const OVERDUE_BORROW_BLOCK_MESSAGE =
	"您目前無法提出借用申請。請洽詢書院辦公室。";

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
