const PLAIN_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function addDays(dateText: string, days: number): string {
	const date = new Date(`${dateText}T00:00:00`);
	date.setDate(date.getDate() + days);
	return (
		date.getFullYear() +
		"-" +
		String(date.getMonth() + 1).padStart(2, "0") +
		"-" +
		String(date.getDate()).padStart(2, "0")
	);
}

export function getTodayText(): string {
	const now = new Date();
	return (
		now.getFullYear() +
		"-" +
		String(now.getMonth() + 1).padStart(2, "0") +
		"-" +
		String(now.getDate()).padStart(2, "0")
	);
}

export function isWeekendDateText(dateText: string): boolean {
	const day = new Date(`${dateText}T00:00:00`).getDay();
	return day === 0 || day === 6;
}

export function isWorkingDayText(dateText: string, holidayDates: Set<string>): boolean {
	return !isWeekendDateText(dateText) && !holidayDates.has(dateText);
}

// 申請需要作業時間：最早可借用日 = 從今天起算的第 workingDays 個工作天
// （跳過週末與國定假日，今天若為工作天則算第 1 天）。
export function computeEarliestBorrowDate(
	today: string,
	holidayDates: Set<string>,
	workingDays = 3,
): string {
	let date = today;
	let count = 0;
	for (let i = 0; i < 365; i += 1) {
		if (isWorkingDayText(date, holidayDates)) {
			count += 1;
			if (count >= workingDays) return date;
		}
		date = addDays(date, 1);
	}
	return date;
}

// 設備借用須在「下一個工作天」前歸還：
// 回傳借用日之後的第一個工作天（跳過週末與國定假日）。
export function computeNextWorkingDay(dateText: string, holidayDates: Set<string>): string {
	let date = addDays(dateText, 1);
	for (let i = 0; i < 365; i += 1) {
		if (isWorkingDayText(date, holidayDates)) return date;
		date = addDays(date, 1);
	}
	return date;
}

// 設備可選歸還日：借用日～下一個工作天（含）之間的所有工作天。
export function getEquipmentReturnCandidateDates(
	borrowedAt: string,
	holidayDates: Set<string>,
): string[] {
	const idealReturnAt = computeNextWorkingDay(borrowedAt, holidayDates);
	const dates: string[] = [];
	let date = borrowedAt;
	for (let i = 0; i < 365; i += 1) {
		if (date > idealReturnAt) break;
		if (isWorkingDayText(date, holidayDates)) dates.push(date);
		date = addDays(date, 1);
	}
	return dates;
}

export function formatDateZh(value: string): string {
	const text = String(value || "").trim();
	if (!text) return "";

	const plainDate = PLAIN_DATE_PATTERN.exec(text);
	if (plainDate) {
		const [, y, m, d] = plainDate;
		return `${y}年${Number(m)}月${Number(d)}日`;
	}

	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return text;
	return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatDateSlash(value: string): string {
	const date = PLAIN_DATE_PATTERN.exec(String(value || "").trim());
	if (!date) return value;
	const [, y, m, d] = date;
	return `${y}/${Number(m)}/${Number(d)}`;
}

export function getWeekdayLabel(dateText: string): string {
	const day = new Date(`${dateText.slice(0, 10)}T00:00:00`).getDay();
	return WEEKDAY_LABELS[day] ?? "";
}

export function formatDateZhWithWeekday(value: string): string {
	const datePart = String(value || "").trim().slice(0, 10);
	if (!PLAIN_DATE_PATTERN.test(datePart)) return formatDateZh(value);
	const weekday = getWeekdayLabel(datePart);
	return weekday ? `${formatDateZh(datePart)}（${weekday}）` : formatDateZh(datePart);
}

export function formatTemporalZh(value: string): string {
	const text = String(value || "").trim();
	const dateTime = DATE_TIME_PATTERN.exec(text);
	if (dateTime) {
		const [, y, m, d, hh, mm] = dateTime;
		return `${y}年${Number(m)}月${Number(d)}日 ${hh}:${mm}`;
	}
	return formatDateZh(text);
}
