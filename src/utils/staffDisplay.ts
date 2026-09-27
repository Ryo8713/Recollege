import { formatTemporalZh, getTodayText } from "./date";
import { getAssetTypeLabel, type AssetType } from "../types/rental";

export function datePart(value: string): string {
	const text = String(value || "").trim();
	const standardDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
	if (standardDate) return `${standardDate[1]}-${standardDate[2]}-${standardDate[3]}`;

	const slashDate = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(text);
	if (slashDate) {
		return `${slashDate[1]}-${slashDate[2].padStart(2, "0")}-${slashDate[3].padStart(2, "0")}`;
	}

	const parsed = new Date(text);
	if (!Number.isNaN(parsed.getTime())) {
		return [
			parsed.getFullYear(),
			String(parsed.getMonth() + 1).padStart(2, "0"),
			String(parsed.getDate()).padStart(2, "0"),
		].join("-");
	}

	return "";
}

export function formatMonthLabel(key: string): string {
	const [year, month] = key.split("-");
	if (!year || !month) return key;
	return `${year}年${Number(month)}月`;
}

export function formatBorrowPeriodZh(start: string, end: string): string {
	const startText = String(start || "").trim();
	const endText = String(end || "").trim();
	const startDateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(startText);
	const endDateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(endText);
	if (startDateTime && endDateTime && startText.slice(0, 10) === endText.slice(0, 10)) {
		const [, y, m, d, startTime] = startDateTime;
		const [, , , , endTime] = endDateTime;
		return `${y}年${Number(m)}月${Number(d)}日 ${startTime} ➜ ${endTime}`;
	}
	return `${formatTemporalZh(startText)} ➜ ${formatTemporalZh(endText)}`;
}

export function formatBorrowItemLabel(item: {
	itemType?: AssetType | "";
	itemName?: string;
}): string {
	const itemName = String(item.itemName || "").trim() || "未記錄";
	const typeLabel = getAssetTypeLabel(item.itemType || "");
	return typeLabel ? `${itemName}(${typeLabel})` : itemName;
}

export function diffDaysFromToday(targetDateText: string, today = getTodayText()): number {
	const todayDate = new Date(`${today}T00:00:00`);
	const target = new Date(`${datePart(targetDateText)}T00:00:00`);
	if (Number.isNaN(todayDate.getTime()) || Number.isNaN(target.getTime())) return 0;
	return Math.floor((target.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));
}

export function getOverdueDays(expectedReturnAt: string, today = getTodayText()): number {
	const days = diffDaysFromToday(expectedReturnAt, today);
	return days < 0 ? Math.abs(days) : 0;
}
