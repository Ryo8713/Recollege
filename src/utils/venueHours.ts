export function padHour(value: number): string {
	return String(value).padStart(2, "0");
}

export function formatHourLabel(value: number): string {
	return `${padHour(value)}:00`;
}

export function formatHourRangeLabel(startHour: number): string {
	return `${formatHourLabel(startHour)}-${formatHourLabel(startHour + 1)}`;
}

export function getVenueOpenHours(date: string, holidayDates: Set<string>): { start: number; end: number } {
	const weekday = new Date(`${date}T00:00:00`).getDay();
	const isHolidayLike = weekday === 0 || weekday === 6 || holidayDates.has(date);
	return { start: isHolidayLike ? 8 : 17, end: 23 };
}
