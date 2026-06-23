import { addDays, isWorkingDayText } from "./date";
import type { BorrowRecord, VenueAvailability } from "../types/rental";

function datePart(value: string): string {
	return String(value || "").trim().slice(0, 10);
}

export function isDateRangeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
	return startA <= endB && endA >= startB;
}

export function isPeriodBlockedByRanges(
	startDate: string,
	endDate: string,
	ranges: Array<{ start: string; end: string }>,
): boolean {
	return ranges.some((range) => isDateRangeOverlapping(range.start, range.end, startDate, endDate));
}

export function findConflictingBorrowRecord(
	record: BorrowRecord,
	expectedReturnAt: string,
	allRecords: BorrowRecord[],
): BorrowRecord | null {
	const assetId = record.assetIds[0];
	if (!assetId) return null;

	const borrowedDate = datePart(record.borrowedAt);
	const returnDate = datePart(expectedReturnAt);

	for (const other of allRecords) {
		if (other.id === record.id) continue;
		if (other.status !== "租借中" && other.status !== "待生效") continue;
		if (!other.assetIds.includes(assetId)) continue;

		const otherStart = datePart(other.borrowedAt);
		const otherEnd = datePart(other.expectedReturnAt);
		if (isDateRangeOverlapping(borrowedDate, returnDate, otherStart, otherEnd)) {
			return other;
		}
	}
	return null;
}

/** 管理員可選的設備應歸還日：僅工作天，並排除他人借用、資產停用、全校暫停衝突。 */
export function computeValidEquipmentReturnDates(
	record: BorrowRecord,
	allRecords: BorrowRecord[],
	assetPauseRanges: Array<{ start: string; end: string }>,
	globalPauseRanges: Array<{ start: string; end: string }>,
	holidayDates: Set<string>,
	maxDays = 365,
): string[] {
	const borrowedDate = datePart(record.borrowedAt);
	const dates: string[] = [];

	for (let day = 0; day < maxDays; day += 1) {
		const candidate = addDays(borrowedDate, day);
		if (!isWorkingDayText(candidate, holidayDates)) continue;
		if (findConflictingBorrowRecord(record, candidate, allRecords)) continue;
		if (isPeriodBlockedByRanges(borrowedDate, candidate, globalPauseRanges)) continue;
		if (isPeriodBlockedByRanges(borrowedDate, candidate, assetPauseRanges)) continue;
		dates.push(candidate);
	}

	return dates;
}

function parseHour(hhmm: string): number {
	return Number(String(hhmm || "").slice(0, 2));
}

function formatHour(hour: number): string {
	return `${String(hour).padStart(2, "0")}:00`;
}

/** 管理員可選的空間結束整點（不含與他人重疊的時段）。 */
export function computeValidVenueEndHours(
	record: BorrowRecord,
	availability: VenueAvailability,
): string[] {
	if (availability.closed) return [];

	const startHour = parseHour(record.borrowedAt.slice(11, 16));
	const currentEndHour = parseHour(record.expectedReturnAt.slice(11, 16));
	const openEnd = parseHour(availability.openEnd);

	const otherIntervals = availability.occupied
		.map((interval) => ({
			start: parseHour(interval.start),
			end: parseHour(interval.end),
		}))
		.filter((interval) => !(interval.start === startHour && interval.end === currentEndHour));

	const hours: string[] = [];
	for (let endHour = startHour + 1; endHour <= openEnd; endHour += 1) {
		const overlapsOther = otherIntervals.some(
			(interval) => startHour < interval.end && interval.start < endHour,
		);
		if (!overlapsOther) {
			hours.push(formatHour(endHour));
		}
	}
	return hours;
}

export function formatConflictMessage(conflict: BorrowRecord): string {
	return `與其他借用衝突：${conflict.studentName}（${conflict.studentId}）借用 ${conflict.borrowedAt.slice(0, 10)}～${conflict.expectedReturnAt.slice(0, 10)}`;
}
