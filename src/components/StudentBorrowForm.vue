<template>
	<section class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
		<AssetAddFeedback
			:phase="submitFeedback.phase"
			:loading-text="submitFeedback.loadingText"
			:success="submitFeedback.success"
			:title="submitFeedback.title"
			:message="submitFeedback.message"
			@close="closeSubmitFeedback"
		/>
		<div
			v-if="returnSearchLoading"
			class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
			role="alertdialog"
			aria-busy="true"
			aria-label="歸還申請查詢中"
		>
			<section class="flex w-full max-w-sm flex-col items-center rounded-2xl bg-white px-8 py-10 shadow-xl">
				<div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" aria-hidden="true" />
				<p class="mt-5 text-center text-base font-semibold text-slate-900">正在查詢歸還申請資料…</p>
				<p class="mt-1 text-center text-sm text-slate-500">請稍候，系統正在讀取租借中紀錄。</p>
			</section>
		</div>
		<div
			v-if="showBorrowConfirmModal"
			class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="確認借用申請"
			@click.self="showBorrowConfirmModal = false"
		>
			<section class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
				<div class="border-b border-slate-200 px-5 py-4">
					<h3 class="text-lg font-bold text-slate-900">請確認以下資料，送出後將進入審核階段。</h3>
				</div>
				<div class="space-y-4 overflow-y-auto px-5 py-4">
					<section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
						<div class="mb-2 flex items-center justify-between">
							<h4 class="text-sm font-bold text-slate-800">借用內容</h4>
						</div>
						<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-[120px_1fr]">
							<p class="font-semibold text-slate-500">借用項目</p>
							<p>
								<span class="rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
									{{ selectedAssetName || "尚未選擇" }}
								</span>
							</p>
							<p class="font-semibold text-slate-500">借用日期</p>
							<p>
								<span class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
									{{ form.borrowedAt ? formatDateZh(form.borrowedAt) : "尚未選擇" }}
								</span>
							</p>
							<p class="font-semibold text-slate-500">歸還日期</p>
							<p>
								<span class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
									{{ form.expectedReturnAt ? formatDateZh(form.expectedReturnAt) : "尚未選擇" }}
								</span>
							</p>
							<p class="font-semibold text-slate-500">借用天數</p>
							<p class="font-semibold text-slate-900">
								{{ borrowDurationDays ? `${borrowDurationDays} 天（含借用當日）` : "尚未選擇" }}
							</p>
						</div>
					</section>

					<section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
						<div class="mb-2 flex items-center justify-between">
							<h4 class="text-sm font-bold text-slate-800">借用人資訊</h4>
						</div>
						<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-[120px_1fr]">
							<p class="font-semibold text-slate-500">姓名 / 學號</p>
							<p class="font-semibold text-slate-900">
								{{ form.studentName || "未填姓名" }} / {{ form.studentId || "未填學號" }}
							</p>
							<p class="font-semibold text-slate-500">聯絡電話</p>
							<p class="font-semibold text-slate-900">{{ form.studentPhone || "未填電話" }}</p>
							<p class="font-semibold text-slate-500">Email</p>
							<p class="font-semibold text-slate-900">{{ form.studentEmail || "未填信箱" }}</p>
						</div>
					</section>

					<section class="rounded-xl border border-slate-200 bg-slate-50 p-3">
						<div class="mb-2 flex items-center justify-between">
							<h4 class="text-sm font-bold text-slate-800">活動資訊</h4>
						</div>
						<div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-[120px_1fr]">
							<p class="font-semibold text-slate-500">活動名稱</p>
							<p class="font-semibold text-slate-900">{{ form.activityName || "尚未填寫" }}</p>
							<p class="font-semibold text-slate-500">借用團體</p>
							<p class="font-semibold text-slate-900">{{ form.borrowerGroup || "尚未填寫" }}</p>
							<p class="font-semibold text-slate-500">負責導師</p>
							<p class="font-semibold text-slate-900">{{ form.mentorName || "無" }}</p>
						</div>
					</section>
				</div>

				<div class="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
					<button
						type="button"
						class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
						:disabled="isSubmitting"
						@click="showBorrowConfirmModal = false"
					>
						返回修改
					</button>
					<button
						type="button"
						class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
						:disabled="isSubmitting"
						@click="submitBorrow"
					>
						確認並送出申請
					</button>
				</div>
			</section>
		</div>

		<div class="grid grid-cols-2 gap-2 border-b border-slate-100 px-5 py-3">
			<button
				class="rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-[0.99] touch-manipulation"
				:class="mode === 'borrow' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'"
				@click="mode = 'borrow'"
			>
				借用
			</button>
			<button
				class="rounded-lg px-3 py-2 text-sm font-semibold transition active:scale-[0.99] touch-manipulation"
				:class="mode === 'return' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'"
				@click="mode = 'return'"
			>
				歸還
			</button>
		</div>
		<div
			v-if="hasRemoteUpdate"
			class="fixed bottom-4 right-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-lg"
		>
			<p class="font-semibold">可借資料可能已更新，請重新整理。</p>
			<button
				type="button"
				class="mt-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
				:disabled="isRefreshingLatestData"
				@click="refreshLatestData"
			>
				{{ isRefreshingLatestData ? "更新中..." : "更新可借資料" }}
			</button>
		</div>
		<div v-if="mode === 'borrow'" class="space-y-4 p-5">
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="rounded-full border px-4 py-2 text-sm font-semibold transition"
					:class="
						borrowEntryMode === 'dateFirst'
							? 'border-slate-900 bg-slate-900 text-white'
							: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
					"
					@click="borrowEntryMode = 'dateFirst'"
				>
					依日期查詢可借空間/設備
				</button>
				<button
					type="button"
					class="rounded-full border px-4 py-2 text-sm font-semibold transition"
					:class="
						borrowEntryMode === 'assetFirst'
							? 'border-slate-900 bg-slate-900 text-white'
							: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
					"
					@click="borrowEntryMode = 'assetFirst'"
				>
					查詢空間/設備可借日期
				</button>
			</div>

			<div v-if="borrowEntryMode === 'dateFirst'" class="space-y-4">
				<section class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">[步驟 1]選擇欲開始借用日期</h3>
					<div class="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
						<input
							v-model="form.borrowedAt"
							type="date"
							:min="today"
							class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring"
						/>
					</div>
				</section>

				<section class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">[步驟 2]選擇當日可借項目（空間或設備擇一）</h3>
					<p class="mt-1 text-xs text-slate-500">單次申請只可選擇一個項目。</p>
					<div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
						<div class="space-y-2">
							<p class="text-xs font-semibold text-slate-500">空間</p>
							<div v-if="availableVenues.length === 0" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">無可借空間</div>
							<div v-else class="flex flex-wrap gap-2">
								<button
									v-for="venue in availableVenues"
									:key="venue.id"
									type="button"
									class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
									:class="
										selectedAssetId === venue.id
											? 'border-blue-900 bg-blue-900 text-white'
											: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
									"
									@click="selectAsset(venue.id, 'venue')"
								>
									{{ venue.name }}
								</button>
							</div>
						</div>
						<div class="space-y-2">
							<p class="text-xs font-semibold text-slate-500">設備</p>
							<div v-if="availableEquipments.length === 0" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">無可借設備</div>
							<div v-else class="flex flex-wrap gap-2">
								<button
									v-for="eq in availableEquipments"
									:key="eq.id"
									type="button"
									class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
									:class="
										selectedAssetId === eq.id
											? 'border-blue-900 bg-blue-900 text-white'
											: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
									"
									@click="selectAsset(eq.id, 'equipment')"
								>
									{{ eq.name }}
								</button>
							</div>
						</div>
					</div>
				</section>

				<section class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">[步驟 3]選擇欲歸還日期</h3>
					<p class="mt-1 text-xs text-slate-500">最多借用 7 天（含借用當日）。</p>
					<p v-if="!selectedAssetId" class="mt-2 text-sm text-slate-500">請先完成步驟 2。</p>
					<p v-else-if="returnDateLoading" class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">正在計算可歸還日期...</p>
					<p v-else-if="returnDateError" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{{ returnDateError }}</p>
					<div v-else-if="availableReturnDates.length > 0" class="mt-3 flex flex-wrap gap-2">
						<button
							v-for="date in availableReturnDates"
							:key="date"
							type="button"
							class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
							:class="
								form.expectedReturnAt === date
									? 'border-emerald-700 bg-emerald-700 text-white'
									: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
							"
							@click="form.expectedReturnAt = date"
						>
							{{ formatDateZh(date) }}
						</button>
					</div>
					<p v-else-if="selectedAssetId" class="mt-2 text-sm text-slate-500">此品項在目前借用日期下無可歸還日期，請改選日期或品項。</p>
				</section>

				<section class="pb-1">
						<h3 class="text-sm font-semibold text-slate-800">[步驟 4]填寫借用資料</h3>
					<div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">學號</span>
							<input
								v-model.trim="form.studentId"
								class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
							/>
						</label>
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">姓名</span>
							<input v-model.trim="form.studentName" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
						</label>
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">聯絡電話</span>
							<input v-model.trim="form.studentPhone" type="tel" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
						</label>
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">電子郵件</span>
							<input v-model.trim="form.studentEmail" type="email" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
						</label>
						<label class="space-y-1 text-sm text-slate-700 md:col-span-2">
							<span class="font-medium">借用團體</span>
							<input v-model.trim="form.borrowerGroup" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" placeholder="課程／服學／小組／家族／社團名稱" />
						</label>
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">負責導師（選填）</span>
							<input v-model.trim="form.mentorName" class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring" />
						</label>
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">活動名稱</span>
							<input
								v-model.trim="form.activityName"
								class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
							/>
						</label>
					</div>
					<button
						type="button"
						:disabled="isSubmitting || availabilityLoading || returnDateLoading"
						class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
						@click="openBorrowConfirmModal"
					>
						送出
					</button>
				</section>
			</div>

			<div v-else class="space-y-3 border-t border-slate-200 pt-4">
				<p class="text-sm text-slate-600">可查詢未來 30 天內的可借日期。</p>
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<label class="space-y-1 text-sm text-slate-700">
						<span class="font-medium">空間</span>
						<select
							v-model="selectedLookupVenueId"
							class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
							@change="selectLookupVenue"
						>
							<option value="">請選擇空間</option>
							<option v-for="asset in selectableVenueAssets" :key="asset.id" :value="asset.id">
								{{ asset.name }}
							</option>
						</select>
					</label>
					<label class="space-y-1 text-sm text-slate-700">
						<span class="font-medium">設備</span>
						<select
							v-model="selectedLookupEquipmentId"
							class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
							@change="selectLookupEquipment"
						>
							<option value="">請選擇設備</option>
							<option v-for="asset in selectableEquipmentAssets" :key="asset.id" :value="asset.id">
								{{ asset.name }}
							</option>
						</select>
					</label>
				</div>
				<p v-if="lookupError" class="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{{ lookupError }}</p>
				<p v-else-if="lookupLoading" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">查詢中...</p>
				<div v-else-if="lookupDates.length > 0" class="space-y-4">
					<p class="text-sm text-slate-600">點選日期後會帶入借用日期，並切換到「依日期查詢可借項目」繼續填單。</p>
					<section
						v-for="section in lookupCalendarSections"
						:key="section.key"
						class="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
					>
						<h4 class="text-sm font-semibold text-slate-800">{{ section.label }}</h4>
						<div class="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
							<span v-for="weekday in lookupWeekdayLabels" :key="`${section.key}-${weekday}`">{{ weekday }}</span>
						</div>
						<div class="grid grid-cols-7 gap-1">
							<template v-for="(cell, index) in section.dayCells" :key="`${section.key}-${index}`">
								<div v-if="!cell" class="h-10 rounded-lg" aria-hidden="true"></div>
								<button
									v-else
									type="button"
									class="h-10 rounded-lg border text-sm font-semibold transition"
									:class="
										cell.available
											? form.borrowedAt === cell.date
												? 'border-blue-700 bg-blue-700 text-white'
												: 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50'
											: 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
									"
									:disabled="!cell.available"
									@click="applySuggestedBorrowDate(cell.date)"
								>
									{{ cell.day }}
								</button>
							</template>
						</div>
					</section>
				</div>
				<p v-else-if="selectedLookupAssetId" class="text-sm text-slate-500">目前不開放借用。</p>
			</div>

			<p v-if="borrowError" class="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
				{{ borrowError }}
			</p>
			<p v-if="availabilityLoading" class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
				正在更新指定日期的可借項目...
			</p>
			<p v-if="availabilityError" class="rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
				{{ availabilityError }}
			</p>
		</div>

		<div v-else class="space-y-4 p-5">
			<p class="text-sm text-slate-500">請輸入學號查詢租借中的項目，勾選欲歸還的項目送出申請。</p>
			<div class="flex gap-2">
				<input
					v-model.trim="returnSearchId"
					:disabled="returnSearchLoading"
					class="flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
					placeholder="輸入學號查詢"
					@keyup.enter="searchReturn"
				/>
				<button
					type="button"
					:disabled="returnSearchLoading"
					class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
					@click="searchReturn"
				>
					{{ returnSearchLoading ? "查詢中..." : "查詢" }}
				</button>
			</div>

			<p v-if="returnSearchError" class="text-sm font-semibold text-red-700">{{ returnSearchError }}</p>

			<div v-if="returnResults.length > 0" class="space-y-3">
				<article
					v-for="record in returnResults"
					:key="record.id"
					class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
				>
					<input
						v-model="selectedReturnIds"
						type="checkbox"
						:value="record.id"
						:disabled="record.returnPending"
						class="mt-1 h-4 w-4 rounded border-slate-300 accent-slate-900"
					/>
					<div class="flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<p class="font-semibold text-slate-900">{{ record.itemName }}</p>
							<span
								v-if="record.returnPending"
								class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
							>
								歸還申請待審核
							</span>
						</div>
						<p class="mt-0.5 text-sm text-slate-500">
							借用日期：{{ formatDateZh(record.borrowedAt) }} | 應還日期：{{ formatDateZh(record.expectedReturnAt) }}
						</p>
						<p v-if="rentalStore.isOverdue(record)" class="mt-0.5 text-xs font-semibold text-red-700">
							已逾借
						</p>
					</div>
				</article>

				<button
					type="button"
					:disabled="selectedReturnIds.length === 0 || isSubmitting"
					class="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 touch-manipulation"
					@click="submitReturn"
				>
					送出歸還申請（{{ selectedReturnIds.length }} 項）
				</button>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import AssetAddFeedback from "./AssetAddFeedback.vue";
import { useBorrowAvailability } from "../composables/useBorrowAvailability";
import { useAssetsStore } from "../stores/assets";
import { useRentalStore, addDays, getTodayText } from "../stores/rental";
import { sheetsApi } from "../services/sheetsApi";
import type { Asset } from "../types/rental";
import type { ReturnSearchRecord } from "../stores/rental";

const assetsStore = useAssetsStore();
const rentalStore = useRentalStore();
const { assets } = storeToRefs(assetsStore);

const today = getTodayText();
const mode = ref<"borrow" | "return">("borrow");
const borrowEntryMode = ref<"dateFirst" | "assetFirst">("dateFirst");

const form = reactive({
	studentId: "",
	studentName: "",
	studentPhone: "",
	studentEmail: "",
	borrowerGroup: "",
	mentorName: "",
	activityName: "",
	borrowedAt: "",
	expectedReturnAt: "",
});

const borrowError = ref("");
const borrowSuccess = ref("");
const showBorrowConfirmModal = ref(false);
const hasRemoteUpdate = ref(false);
const isRefreshingLatestData = ref(false);
const lastKnownDataVersion = ref("");
let dataVersionPollTimer: ReturnType<typeof setInterval> | null = null;
type SubmitFeedbackPhase = null | "loading" | "result";
const submitFeedback = reactive<{
	phase: SubmitFeedbackPhase;
	loadingText: string;
	success: boolean;
	title: string;
	message: string;
}>({
	phase: null,
	loadingText: "",
	success: true,
	title: "",
	message: "",
});
const isSubmitting = computed(() => submitFeedback.phase === "loading");
const selectableVenueAssets = computed(() =>
	assetsStore.assets.filter((a) => a.status !== "停用中" && a.type === "venue"),
);
const selectableEquipmentAssets = computed(() =>
	assetsStore.assets.filter((a) => a.status !== "停用中" && a.type === "equipment"),
);

const {
	selectedAssetId,
	selectedAssetType,
	availableVenues,
	availableEquipments,
	availabilityError,
	availabilityLoading,
	availableReturnDates,
	returnDateLoading,
	returnDateError,
	selectedLookupAssetId,
	lookupDates,
	lookupLoading,
	lookupError,
	selectAsset,
	applySuggestedBorrowDate,
	clearAvailabilityCaches,
	ensureBlockedRangesLoaded,
	refreshBorrowAvailability,
} = useBorrowAvailability({
	assets,
	form,
	mode,
	borrowEntryMode,
	today,
});

const selectedAssetName = computed(() => {
	const asset =
		availableVenues.value.find((a) => a.id === selectedAssetId.value) ||
		availableEquipments.value.find((a) => a.id === selectedAssetId.value) ||
		assetsStore.assets.find((a) => a.id === selectedAssetId.value);
	return asset?.name ?? "";
});

const borrowDurationDays = computed(() => {
	if (!form.borrowedAt || !form.expectedReturnAt) return 0;
	const start = new Date(`${form.borrowedAt}T00:00:00`);
	const end = new Date(`${form.expectedReturnAt}T00:00:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
	const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
	return diff > 0 ? diff : 0;
});

function buildItemName(): string {
	if (!selectedAssetId.value || !selectedAssetName.value || !selectedAssetType.value) return "";
	const label = selectedAssetType.value === "venue" ? "空間" : "設備";
	return `${label}:${selectedAssetName.value}`;
}

function formatDateZh(value: string): string {
	const text = String(value || "").trim();
	if (!text) return "";

	const plainDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (plainDate) {
		const [, y, m, d] = plainDate;
		return `${y}年${Number(m)}月${Number(d)}日`;
	}

	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return text;
	return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

async function syncDataVersionSnapshot() {
	try {
		const { version } = await sheetsApi.fetchDataVersion();
		lastKnownDataVersion.value = version;
	} catch {
		// Ignore version sync errors; borrow flow should still work.
	}
}

async function checkRemoteDataVersion() {
	if (document.visibilityState === "hidden") return;
	if (isRefreshingLatestData.value) return;
	try {
		const { version } = await sheetsApi.fetchDataVersion();
		if (!lastKnownDataVersion.value) {
			lastKnownDataVersion.value = version;
			return;
		}
		if (version !== lastKnownDataVersion.value) {
			hasRemoteUpdate.value = true;
		}
	} catch {
		// Ignore polling errors and try again next tick.
	}
}

async function refreshLatestData() {
	isRefreshingLatestData.value = true;
	try {
		await Promise.all([
			assetsStore.loadAssets({ force: true }),
			rentalStore.loadRecords({ force: true }),
		]);
		await refreshBorrowAvailability();
		if (returnSearchId.value) {
			await searchReturn();
		}
		await syncDataVersionSnapshot();
		hasRemoteUpdate.value = false;
	} finally {
		isRefreshingLatestData.value = false;
	}
}

async function submitBorrow() {
	borrowError.value = "";
	borrowSuccess.value = "";
	if (!validateBorrowBeforeSubmit()) return;
	showBorrowConfirmModal.value = false;

	const assetIds = [selectedAssetId.value];

	submitFeedback.phase = "loading";
	submitFeedback.loadingText = "正在送出借用申請…";

	try {
		await rentalStore.submitBorrowApplication({
			studentId: form.studentId,
			studentName: form.studentName,
			studentPhone: form.studentPhone,
			studentEmail: form.studentEmail,
			borrowerGroup: form.borrowerGroup,
			mentorName: form.mentorName,
			activityName: form.activityName,
			itemName: buildItemName(),
			assetIds,
			borrowedAt: form.borrowedAt,
			expectedReturnAt: form.expectedReturnAt,
		});
		clearAvailabilityCaches();
		void ensureBlockedRangesLoaded(true);
		borrowSuccess.value = "借用申請已送出。";
		selectedAssetId.value = "";
		selectedAssetType.value = "";
		availableReturnDates.value = [];
		form.studentId = "";
		form.studentName = "";
		form.studentPhone = "";
		form.studentEmail = "";
		form.borrowerGroup = "";
		form.mentorName = "";
		form.activityName = "";
		form.borrowedAt = "";
		form.expectedReturnAt = "";
		submitFeedback.phase = "result";
		submitFeedback.success = true;
		submitFeedback.title = "送出成功";
		submitFeedback.message = "借用申請已送出。";
		void syncDataVersionSnapshot();
	} catch (e) {
		borrowError.value = e instanceof Error ? e.message : "送出失敗，請稍後再試。";
		submitFeedback.phase = "result";
		submitFeedback.success = false;
		submitFeedback.title = "送出失敗";
		submitFeedback.message = borrowError.value;
	}
}

function validateBorrowBeforeSubmit(): boolean {
	if (!selectedAssetId.value) {
		borrowError.value = "請先選擇一項欲借用品項（空間或設備擇一）。";
		return false;
	}
	if (!form.studentId || !form.studentName || !form.studentPhone || !form.studentEmail) {
		borrowError.value = "請填寫完整的借用人資訊。";
		return false;
	}
	if (!form.borrowerGroup || !form.activityName) {
		borrowError.value = "請填寫借用團體與活動名稱。";
		return false;
	}
	if (!form.borrowedAt || !form.expectedReturnAt) {
		borrowError.value = "請先選擇借用日期與可歸還日期。";
		return false;
	}
	if (form.borrowedAt < today) {
		borrowError.value = "借用日期需為今天或之後。";
		return false;
	}
	if (availabilityLoading.value) {
		borrowError.value = "可借項目仍在更新中，請稍候再送出。";
		return false;
	}
	const min = addDays(form.borrowedAt, 0);
	const max = addDays(form.borrowedAt, 6);
	if (form.expectedReturnAt < min || form.expectedReturnAt > max) {
		borrowError.value = "歸還日期需在借用日期當天起，且最多借用 7 天。";
		return false;
	}
	return true;
}

function openBorrowConfirmModal() {
	borrowError.value = "";
	if (!validateBorrowBeforeSubmit()) return;
	showBorrowConfirmModal.value = true;
}

const returnSearchId = ref("");
const returnSearchError = ref("");
const returnResults = ref<ReturnSearchRecord[]>([]);
const selectedReturnIds = ref<string[]>([]);
const returnSuccess = ref("");
const returnSearchLoading = ref(false);
const selectedLookupVenueId = ref("");
const selectedLookupEquipmentId = ref("");

const lookupWeekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

const lookupCalendarSections = computed(() => {
	const byMonth = new Map<string, string[]>();
	for (const date of lookupDates.value) {
		const key = String(date || "").slice(0, 7);
		if (!key) continue;
		const list = byMonth.get(key) ?? [];
		list.push(date);
		byMonth.set(key, list);
	}
	return Array.from(byMonth.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, dates]) => {
			const [yearText, monthText] = key.split("-");
			const year = Number(yearText);
			const month = Number(monthText);
			const firstWeekday = new Date(year, month - 1, 1).getDay();
			const daysInMonth = new Date(year, month, 0).getDate();
			const availableDates = new Set(dates);
			const dayCells: Array<{ date: string; day: number; available: boolean } | null> = [];
			for (let i = 0; i < firstWeekday; i += 1) {
				dayCells.push(null);
			}
			for (let day = 1; day <= daysInMonth; day += 1) {
				const dateText = `${yearText}-${monthText}-${String(day).padStart(2, "0")}`;
				dayCells.push({
					date: dateText,
					day,
					available: availableDates.has(dateText),
				});
			}
			while (dayCells.length % 7 !== 0) {
				dayCells.push(null);
			}
			return {
				key,
				label: `${year}年${month}月`,
				dayCells,
			};
		});
});

function selectLookupVenue() {
	if (selectedLookupVenueId.value) {
		selectedLookupEquipmentId.value = "";
		selectedLookupAssetId.value = selectedLookupVenueId.value;
		return;
	}
	selectedLookupAssetId.value = selectedLookupEquipmentId.value || "";
}

function selectLookupEquipment() {
	if (selectedLookupEquipmentId.value) {
		selectedLookupVenueId.value = "";
		selectedLookupAssetId.value = selectedLookupEquipmentId.value;
		return;
	}
	selectedLookupAssetId.value = selectedLookupVenueId.value || "";
}

async function searchReturn() {
	if (returnSearchLoading.value) return;
	returnSearchError.value = "";
	returnResults.value = [];
	selectedReturnIds.value = [];
	if (!returnSearchId.value) {
		returnSearchError.value = "請輸入學號。";
		return;
	}
	returnSearchLoading.value = true;
	try {
		await rentalStore.loadRecords();
		const results = rentalStore.getRecordsByStudentId(returnSearchId.value);
		if (results.length === 0) {
			returnSearchError.value = "查無此學號的租借中紀錄。";
			return;
		}
		returnResults.value = results;
	} finally {
		returnSearchLoading.value = false;
	}
}

async function submitReturn() {
	if (selectedReturnIds.value.length === 0) return;
	returnSuccess.value = "";
	submitFeedback.phase = "loading";
	submitFeedback.loadingText = "正在送出歸還申請…";
	const submittedRecordIds: string[] = [];

	try {
		for (const recordId of selectedReturnIds.value) {
			const record = returnResults.value.find((r) => r.id === recordId);
			if (!record) continue;
			if (record.returnPending) continue;
			await rentalStore.submitReturnApplication({
				studentId: record.studentId,
				studentName: record.studentName,
				studentPhone: record.studentPhone,
				studentEmail: record.studentEmail,
				recordId,
			});
			submittedRecordIds.push(recordId);
		}
		clearAvailabilityCaches();
		void ensureBlockedRangesLoaded(true);

		returnSuccess.value = `已送出 ${submittedRecordIds.length} 筆歸還申請。`;
		returnResults.value = [];
		selectedReturnIds.value = [];
		returnSearchId.value = "";
		submitFeedback.phase = "result";
		submitFeedback.success = true;
		submitFeedback.title = "送出成功";
		submitFeedback.message = returnSuccess.value;
		void syncDataVersionSnapshot();
	} catch (e) {
		const message = e instanceof Error ? e.message : "送出失敗，請稍後再試。";
		submitFeedback.phase = "result";
		submitFeedback.success = false;
		submitFeedback.title = "送出失敗";
		submitFeedback.message = message;
	}
}

function closeSubmitFeedback() {
	submitFeedback.phase = null;
}

watch(
	() => selectedLookupAssetId.value,
	(assetId) => {
		if (!assetId) {
			selectedLookupVenueId.value = "";
			selectedLookupEquipmentId.value = "";
			return;
		}
		if (selectableVenueAssets.value.some((asset) => asset.id === assetId)) {
			selectedLookupVenueId.value = assetId;
			selectedLookupEquipmentId.value = "";
			return;
		}
		if (selectableEquipmentAssets.value.some((asset) => asset.id === assetId)) {
			selectedLookupEquipmentId.value = assetId;
			selectedLookupVenueId.value = "";
		}
	},
	{ immediate: true },
);

onMounted(() => {
	void syncDataVersionSnapshot();
	dataVersionPollTimer = setInterval(() => {
		void checkRemoteDataVersion();
	}, 30000);
});

onBeforeUnmount(() => {
	if (dataVersionPollTimer) {
		clearInterval(dataVersionPollTimer);
		dataVersionPollTimer = null;
	}
});
</script>
