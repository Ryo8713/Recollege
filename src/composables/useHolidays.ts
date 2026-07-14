import { ref } from "vue";
import { sheetsApi } from "../services/sheetsApi";

export function useHolidays() {
	const holidayDates = ref<Set<string>>(new Set());

	async function loadHolidays() {
		try {
			const holidays = await sheetsApi.fetchHolidays();
			holidayDates.value = new Set(holidays.map((holiday) => holiday.date));
		} catch {
			// 假日讀取失敗時不阻擋借用流程，僅退回不跳過國定假日的前置天數計算。
		}
	}

	return { holidayDates, loadHolidays };
}
