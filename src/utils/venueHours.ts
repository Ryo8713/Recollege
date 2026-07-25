export function padHour(value: number): string {
	return String(value).padStart(2, "0");
}

export function formatHourLabel(value: number): string {
	return `${padHour(value)}:00`;
}

export function formatHourRangeLabel(startHour: number): string {
	return `${formatHourLabel(startHour)}-${formatHourLabel(startHour + 1)}`;
}
