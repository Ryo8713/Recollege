export function padHour(value: number): string {
	return String(value).padStart(2, "0");
}

export function formatHourLabel(value: number): string {
	return `${padHour(value)}:00`;
}

export function formatHourRangeLabel(startHour: number): string {
	return `${formatHourLabel(startHour)}-${formatHourLabel(startHour + 1)}`;
}

export function getDateText(date: Date): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

export function getMinimumVenueStartHour(dateText: string): number | null {
	const now = new Date();
	if (dateText !== getDateText(now)) return null;
	return now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours();
}
