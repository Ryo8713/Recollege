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
				<p class="mt-1 text-center text-sm text-slate-500">請稍候</p>
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
							<template v-if="isVenueSelected">
								<p class="font-semibold text-slate-500">借用時段</p>
								<p>
									<span class="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
										{{ selectedVenueSlotLabels.length > 0 ? selectedVenueSlotLabels.join("、") : "尚未選擇" }}
									</span>
								</p>
								<p class="font-semibold text-slate-500">借用時數</p>
								<p class="font-semibold text-slate-900">
									{{ venueDurationHours ? `${venueDurationHours} 小時` : "尚未選擇" }}
								</p>
							</template>
							<template v-else>
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
							</template>
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
							<p class="font-semibold text-slate-500">電子郵件</p>
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
			class="fixed right-4 top-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-lg"
		>
			<div class="flex items-start justify-between gap-3">
				<p class="font-semibold">可借日期可能已變動，請重新整理。</p>
				<button
					type="button"
					class="-mr-1 rounded px-1.5 py-0.5 text-lg font-bold leading-none text-blue-700 transition hover:bg-blue-100"
					aria-label="關閉更新通知"
					@click="dismissRemoteUpdate"
				>
					×
				</button>
			</div>
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
					依日期查詢可借用空間/設備
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
					查詢空間/設備可借用日期
				</button>
			</div>

			<div v-if="borrowEntryMode === 'dateFirst'" class="space-y-4">
				<section class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">【步驟一】選擇欲開始借用之日期</h3>
					<p class="mt-1 text-xs text-slate-500">
						申請需約 {{ BORROW_LEAD_WORKING_DAYS }} 個工作天作業時間（申請當日不計入，已排除週末與國定假日），最早可借用日期為
						<span class="font-semibold text-slate-700">{{ formatDateZh(earliestBorrowDate) }}</span>。設備借用與歸還日須為工作天（週末與國定假日不可）。
					</p>
					<div class="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
						<input
							v-model="form.borrowedAt"
							type="date"
							:min="earliestBorrowDate"
							class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none ring-blue-500 focus:ring"
						/>
					</div>
				</section>

				<section class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">【步驟二】選擇當日可借用項目（空間或設備擇一）</h3>
					<p class="mt-1 text-xs text-slate-500">單次借用僅能選擇一個項目。</p>
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

				<section v-if="isVenueSelected" class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">【步驟三】選擇借用時段</h3>
					<p class="mt-1 text-xs text-slate-500">空間僅能借用連續時段，所選時段必須前後相連。</p>
					<p v-if="!selectedAssetId" class="mt-2 text-sm text-slate-500">請先完成步驟 2。</p>
					<p v-else-if="venueAvailabilityLoading" class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">正在讀取可借時段...</p>
					<p v-else-if="venueAvailabilityError" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{{ venueAvailabilityError }}</p>
					<div v-else-if="venueAvailability && !venueAvailability.closed" class="mt-2 space-y-3">
						<p class="text-xs font-semibold text-slate-500">
							{{ venueAvailability.isHoliday ? "假日" : "平日" }}可借用時段:
							{{ venueAvailability.openStart }}–{{ venueAvailability.openEnd }}
						</p>
						<div>
							<p class="text-xs font-semibold text-slate-500">可借時段</p>
							<div v-if="venueStartHours.length > 0" class="mt-1 flex flex-wrap gap-2">
								<button
									v-for="hour in venueStartHours"
									:key="`slot-${hour}`"
									type="button"
									class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
									:class="
										selectedVenueSlotSet.has(hour)
											? 'border-emerald-700 bg-emerald-700 text-white'
											: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
									"
									@click="toggleVenueSlot(hour)"
								>
									{{ formatHourRangeLabel(hour) }}
								</button>
							</div>
							<p v-else class="mt-1 text-sm text-slate-500">此日已無可借時段，請改選日期或項目。</p>
						</div>
						<p v-if="venueDurationHours > 0" class="text-sm font-semibold text-slate-900">
							已選 {{ venueDurationHours }} 小時：{{ selectedVenueSlotLabels.join("、") }}
						</p>
					</div>
					<p v-else-if="selectedAssetId" class="mt-2 text-sm text-slate-500">此空間於所選日期不開放借用，請改選日期或項目。</p>
				</section>

				<section v-else class="border-b border-slate-200 pb-4">
					<h3 class="text-sm font-semibold text-slate-800">【步驟三】應歸還日期</h3>
					<p class="mt-1 text-xs text-slate-500">設備須於借用日的下一個工作天前歸還（週末與國定假日不可借用或歸還），系統已自動為您計算應歸還日期。</p>
					<p v-if="!selectedAssetId" class="mt-2 text-sm text-slate-500">請先完成步驟 2。</p>
					<p v-else-if="returnDateLoading" class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">正在確認可歸還日期...</p>
					<p v-else-if="returnDateError" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{{ returnDateError }}</p>
					<template v-else-if="equipmentReturnDate">
						<div class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
							<p class="text-xs font-semibold text-emerald-700">應歸還日期</p>
							<p class="mt-1 text-lg font-bold text-emerald-900">{{ formatDateZh(equipmentReturnDate) }}</p>
						</div>
					</template>
					<p v-else-if="hasNoAvailableReturnDate" class="mt-2 text-sm text-slate-500">此品項在所選借用日期下無可歸還日期，請改選借用日期或項目。</p>
					<p v-else-if="selectedAssetId" class="mt-2 text-sm text-slate-500">請先選擇借用日期。</p>
				</section>

				<section class="pb-1">
						<h3 class="text-sm font-semibold text-slate-800">【步驟四】填寫借用資料</h3>
					<div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
						<label class="space-y-1 text-sm text-slate-700">
							<span class="font-medium">學號/員編</span>
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
					<p
						v-if="form.studentId && isStudentBorrowBlocked"
						class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
					>
						{{ OVERDUE_BORROW_BLOCK_MESSAGE }}
					</p>
					<button
						type="button"
						:disabled="isSubmitting || availabilityLoading || returnDateLoading || isStudentBorrowBlocked"
						class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
						@click="openBorrowConfirmModal"
					>
						送出
					</button>
				</section>
			</div>

			<div v-else class="space-y-3 border-t border-slate-200 pt-4">
				<p class="text-sm text-slate-600">可查詢未來 30 天內可借用日期。</p>
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
					<div v-if="isLookupVenueSelected" class="space-y-3">
						<p class="text-sm text-slate-600">以下列出未來 30 天內可借用日期與時段，點選日期後可繼續填單。</p>
						<p v-if="venueLookupPreviewLoading" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">正在整理可借時段...</p>
						<p v-else-if="venueLookupPreviewError" class="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">{{ venueLookupPreviewError }}</p>
						<section
							v-for="preview in visibleVenueLookupPreviews"
							:key="preview.date"
							class="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"
						>
							<div class="min-w-0 flex-1">
								<h4 class="text-sm font-bold text-blue-950">{{ formatDateZhWithWeekday(preview.date) }}</h4>
								<p class="text-xs font-semibold text-blue-700">
									{{ preview.isHoliday ? "假日" : "平日" }}可借時段
								</p>
								<div class="mt-2 flex flex-wrap gap-2">
									<span
										v-for="slot in preview.slots"
										:key="`${preview.date}-${slot}`"
										class="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800"
									>
										{{ slot }}
									</span>
								</div>
							</div>
							<button
								type="button"
								class="shrink-0 self-center rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600"
								@click="applySuggestedBorrowDate(preview.date)"
							>
								選擇
							</button>
						</section>
					</div>
					<div v-else class="space-y-4">
						<p class="text-sm text-slate-600">點選日期後，頁面會切換至「依日期查詢可借項目」繼續填單。</p>
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
										class="flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition"
										:class="
											cell.available
												? form.borrowedAt === cell.date
													? 'border-blue-700 bg-blue-700 text-white'
													: 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50'
												: 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
										"
										:disabled="!cell.available"
										:title="formatDateZhWithWeekday(cell.date)"
										@click="applySuggestedBorrowDate(cell.date)"
									>
										{{ cell.day }}
									</button>
								</template>
							</div>
						</section>
					</div>
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
			<p class="text-sm text-slate-500">請輸入 學號/員編 查詢租借中的項目，勾選欲歸還的項目送出申請。</p>
			<div class="flex gap-2">
				<input
					v-model.trim="returnSearchId"
					:disabled="returnSearchLoading"
					class="flex-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
					placeholder="請輸入學號/員編"
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
						<p class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
							<span class="font-semibold text-amber-700">借用時間：</span>
							<span class="font-bold text-slate-950">{{ formatTemporalZh(record.borrowedAt) }}</span>
							<span class="mx-2 text-slate-400">|</span>
							<span class="font-semibold text-amber-700">應還時間：</span>
							<span class="font-bold text-slate-950">{{ formatTemporalZh(record.expectedReturnAt) }}</span>
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
import { OVERDUE_BORROW_BLOCK_MESSAGE, useRentalStore } from "../stores/rental";
import { computeEarliestBorrowDate, computeNextWorkingDay, formatDateZh, formatDateZhWithWeekday, formatTemporalZh, getTodayText, isWorkingDayText, WEEKDAY_LABELS } from "../utils/date";
import { sheetsApi } from "../services/sheetsApi";
import type { Asset, VenueAvailability } from "../types/rental";
import type { ReturnSearchRecord } from "../stores/rental";

const assetsStore = useAssetsStore();
const rentalStore = useRentalStore();
const { assets } = storeToRefs(assetsStore);

const lookupWeekdayLabels = WEEKDAY_LABELS;

const today = getTodayText();
const mode = ref<"borrow" | "return">("borrow");
const borrowEntryMode = ref<"dateFirst" | "assetFirst">("dateFirst");

const BORROW_LEAD_WORKING_DAYS = 3;
const holidayDates = ref<Set<string>>(new Set());
const earliestBorrowDate = computed(() =>
	computeEarliestBorrowDate(today, holidayDates.value, BORROW_LEAD_WORKING_DAYS),
);

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
const latestRemoteDataVersion = ref("");
const dismissedRemoteDataVersion = ref("");
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
	venueAvailability,
	venueAvailabilityLoading,
	venueAvailabilityError,
	venueStartHours,
	fetchVenueAvailabilityCached,
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
	holidayDates,
});

const isVenueSelected = computed(() => selectedAssetType.value === "venue");
const selectedVenueSlotHours = ref<number[]>([]);
const selectedVenueSlotSet = computed(() => new Set(selectedVenueSlotHours.value));
const sortedSelectedVenueSlotHours = computed(() => [...selectedVenueSlotHours.value].sort((a, b) => a - b));
const selectedVenueStartHour = computed(() => sortedSelectedVenueSlotHours.value[0] ?? null);
const selectedVenueEndHour = computed(() => {
	const selected = sortedSelectedVenueSlotHours.value;
	const lastHour = selected[selected.length - 1];
	return lastHour == null ? null : lastHour + 1;
});
const selectedVenueSlotLabels = computed(() =>
	sortedSelectedVenueSlotHours.value.map((hour) => formatHourRangeLabel(hour)),
);
const venueDurationHours = computed(() =>
	selectedVenueSlotHours.value.length,
);

function padHour(value: number): string {
	return String(value).padStart(2, "0");
}

function formatHourLabel(value: number): string {
	return `${padHour(value)}:00`;
}

function formatHourRangeLabel(startHour: number): string {
	return `${formatHourLabel(startHour)}-${formatHourLabel(startHour + 1)}`;
}

function getDateText(date: Date): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

function getMinimumVenueStartHour(dateText: string): number | null {
	const now = new Date();
	if (dateText !== getDateText(now)) return null;
	return now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours();
}

function toggleVenueSlot(hour: number) {
	const selected = sortedSelectedVenueSlotHours.value;
	if (selected.length === 0) {
		selectedVenueSlotHours.value = [hour];
		return;
	}

	const min = selected[0];
	const max = selected[selected.length - 1];
	if (selectedVenueSlotSet.value.has(hour)) {
		if (hour === min || hour === max) {
			selectedVenueSlotHours.value = selected.filter((selectedHour) => selectedHour !== hour);
			return;
		}
		selectedVenueSlotHours.value = [hour];
		return;
	}

	if (hour === min - 1 || hour === max + 1) {
		selectedVenueSlotHours.value = [...selected, hour].sort((a, b) => a - b);
		return;
	}

	selectedVenueSlotHours.value = [hour];
}

watch(
	() => [selectedAssetId.value, form.borrowedAt],
	() => {
		selectedVenueSlotHours.value = [];
	},
);

watch(venueStartHours, (hours) => {
	const available = new Set(hours);
	const selected = selectedVenueSlotHours.value.filter((hour) => available.has(hour));
	if (selected.length !== selectedVenueSlotHours.value.length) {
		selectedVenueSlotHours.value = selected;
	}
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

// 設備理想歸還日 = 借用日的下一個工作天（跳過週末與國定假日）。
const idealReturnDate = computed(() => {
	if (isVenueSelected.value || !form.borrowedAt) return "";
	return computeNextWorkingDay(form.borrowedAt, holidayDates.value);
});

// 系統依借用日自動推算應歸還日期：
// 預設為下一個工作天；若該日前已被借用或落在暫停區間，則自動往前縮到「不超過理想歸還日的最近可歸還工作天」。
const equipmentReturnDate = computed(() => {
	if (!idealReturnDate.value) return "";
	const candidates = availableReturnDates.value
		.filter(
			(date) =>
				date <= idealReturnDate.value &&
				isWorkingDayText(date, holidayDates.value),
		)
		.sort();
	if (candidates.length === 0) return "";
	return candidates[candidates.length - 1];
});

// 應歸還日因衝突而被提前（早於理想的下一個工作天）。
const isEquipmentReturnDateAdjusted = computed(
	() =>
		Boolean(equipmentReturnDate.value) &&
		Boolean(idealReturnDate.value) &&
		equipmentReturnDate.value < idealReturnDate.value,
);

// 所選借用日下，該設備完全沒有可歸還日期。
const hasNoAvailableReturnDate = computed(() => {
	if (isVenueSelected.value || !selectedAssetId.value || !form.borrowedAt) return false;
	if (returnDateLoading.value || returnDateError.value) return false;
	return !equipmentReturnDate.value;
});

const isStudentBorrowBlocked = computed(() =>
	rentalStore.isStudentBorrowRestricted(form.studentId),
);

watch(
	[equipmentReturnDate, isVenueSelected, () => selectedAssetId.value],
	() => {
		if (isVenueSelected.value || !selectedAssetId.value) return;
		form.expectedReturnAt = equipmentReturnDate.value;
	},
	{ immediate: true },
);

function buildItemName(): string {
	if (!selectedAssetId.value || !selectedAssetName.value || !selectedAssetType.value) return "";
	const label = selectedAssetType.value === "venue" ? "空間" : "設備";
	return `${label}:${selectedAssetName.value}`;
}

async function syncDataVersionSnapshot() {
	try {
		const { version } = await sheetsApi.fetchDataVersion();
		lastKnownDataVersion.value = version;
		latestRemoteDataVersion.value = "";
		dismissedRemoteDataVersion.value = "";
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
		if (version !== lastKnownDataVersion.value && version !== dismissedRemoteDataVersion.value) {
			latestRemoteDataVersion.value = version;
			hasRemoteUpdate.value = true;
		}
	} catch {
		// Ignore polling errors and try again next tick.
	}
}

function dismissRemoteUpdate() {
	dismissedRemoteDataVersion.value = latestRemoteDataVersion.value;
	hasRemoteUpdate.value = false;
}

async function refreshLatestData() {
	isRefreshingLatestData.value = true;
	try {
		await Promise.all([
			assetsStore.loadAssets({ force: true }),
			rentalStore.loadRecords({ force: true }),
			rentalStore.loadStudentBlocks({ force: true }),
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
	const borrowedAtPayload = isVenueSelected.value
		? `${form.borrowedAt} ${formatHourLabel(selectedVenueStartHour.value as number)}`
		: form.borrowedAt;
	const expectedReturnAtPayload = isVenueSelected.value
		? `${form.borrowedAt} ${formatHourLabel(selectedVenueEndHour.value as number)}`
		: form.expectedReturnAt;

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
			borrowedAt: borrowedAtPayload,
			expectedReturnAt: expectedReturnAtPayload,
		});
		clearAvailabilityCaches();
		void ensureBlockedRangesLoaded(true);
		borrowSuccess.value = "借用申請已送出。";
		selectedAssetId.value = "";
		selectedAssetType.value = "";
		availableReturnDates.value = [];
		selectedVenueSlotHours.value = [];
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
	if (isStudentBorrowBlocked.value) {
		borrowError.value = OVERDUE_BORROW_BLOCK_MESSAGE;
		return false;
	}
	if (!form.borrowerGroup || !form.activityName) {
		borrowError.value = "請填寫借用團體與活動名稱。";
		return false;
	}
	if (!form.borrowedAt) {
		borrowError.value = "請先選擇借用日期。";
		return false;
	}
	if (form.borrowedAt < earliestBorrowDate.value) {
		borrowError.value = `因申請需約 ${BORROW_LEAD_WORKING_DAYS} 個工作天作業時間（申請當日不計入），最早可借用日期為 ${formatDateZh(earliestBorrowDate.value)}（已排除週末與國定假日）。`;
		return false;
	}
	if (!isVenueSelected.value && !isWorkingDayText(form.borrowedAt, holidayDates.value)) {
		borrowError.value = "設備借用日須為工作天（週末與國定假日不可借用）。";
		return false;
	}
	if (availabilityLoading.value) {
		borrowError.value = "可借項目仍在更新中，請稍候再送出。";
		return false;
	}
	if (isVenueSelected.value) {
		if (selectedVenueSlotHours.value.length === 0) {
			borrowError.value = "請選擇空間借用時段。";
			return false;
		}
		const availableStartHours = new Set(venueStartHours.value);
		if (selectedVenueSlotHours.value.some((hour) => !availableStartHours.has(hour))) {
			borrowError.value = "所選時段已開始或已不可借，請重新選擇時段。";
			return false;
		}
		return true;
	}
	if (hasNoAvailableReturnDate.value) {
		borrowError.value = "此品項在所選借用日期下無可歸還日期，請改選借用日期或項目。";
		return false;
	}
	if (!form.expectedReturnAt) {
		borrowError.value = "系統尚未計算出應歸還日期，請稍候或重新選擇借用日期。";
		return false;
	}
	return true;
}

function openBorrowConfirmModal() {
	borrowError.value = "";
	void Promise.all([rentalStore.loadRecords(), rentalStore.loadStudentBlocks()]).then(() => {
		if (!validateBorrowBeforeSubmit()) return;
		showBorrowConfirmModal.value = true;
	});
}

const returnSearchId = ref("");
const returnSearchError = ref("");
const returnResults = ref<ReturnSearchRecord[]>([]);
const selectedReturnIds = ref<string[]>([]);
const returnSuccess = ref("");
const returnSearchLoading = ref(false);
const selectedLookupVenueId = ref("");
const selectedLookupEquipmentId = ref("");
const venueLookupPreviews = ref<Array<{ date: string; isHoliday: boolean; slots: string[] }>>([]);
const venueLookupPreviewLoading = ref(false);
const venueLookupPreviewError = ref("");
const venueLookupPreviewSeq = ref(0);
const isLookupVenueSelected = computed(() => Boolean(selectedLookupVenueId.value));
const visibleVenueLookupPreviews = computed(() =>
	venueLookupPreviews.value.filter((preview) => preview.date >= earliestBorrowDate.value),
);

function getAvailableSlotLabels(availability: VenueAvailability): string[] {
	if (availability.closed) return [];
	const occupied = new Set<number>();
	for (const interval of availability.occupied) {
		const start = Number(interval.start.slice(0, 2));
		const end = Number(interval.end.slice(0, 2));
		for (let hour = start; hour < end; hour += 1) {
			occupied.add(hour);
		}
	}

	const slots: string[] = [];
	const openStart = Number(availability.openStart.slice(0, 2));
	const openEnd = Number(availability.openEnd.slice(0, 2));
	const minimumStartHour = getMinimumVenueStartHour(availability.date);
	const effectiveOpenStart = minimumStartHour == null ? openStart : Math.max(openStart, minimumStartHour);
	for (let hour = effectiveOpenStart; hour < openEnd; hour += 1) {
		if (!occupied.has(hour)) {
			slots.push(formatHourRangeLabel(hour));
		}
	}
	return slots;
}

async function loadVenueLookupPreviews() {
	venueLookupPreviews.value = [];
	venueLookupPreviewError.value = "";
	if (!selectedLookupVenueId.value || lookupDates.value.length === 0) return;

	const seq = ++venueLookupPreviewSeq.value;
	venueLookupPreviewLoading.value = true;
	try {
		const dates = [...lookupDates.value];
		const workerCount = Math.min(3, dates.length);
		let nextIndex = 0;
		await Promise.all(
			Array.from({ length: workerCount }, async () => {
				while (nextIndex < dates.length) {
					const date = dates[nextIndex];
					nextIndex += 1;
					if (seq !== venueLookupPreviewSeq.value) return;

					const availability = await fetchVenueAvailabilityCached(selectedLookupVenueId.value, date);
					if (seq !== venueLookupPreviewSeq.value) return;
					const slots = getAvailableSlotLabels(availability);
					if (slots.length === 0) continue;
					const nextPreviews = [
						...venueLookupPreviews.value.filter((preview) => preview.date !== date),
						{ date, isHoliday: availability.isHoliday, slots },
					].sort((a, b) => a.date.localeCompare(b.date));
					venueLookupPreviews.value = nextPreviews;
				}
			}),
		);
		if (seq !== venueLookupPreviewSeq.value) return;
	} catch (error) {
		if (seq !== venueLookupPreviewSeq.value) return;
		venueLookupPreviewError.value = error instanceof Error ? error.message : "整理空間可借時段失敗";
	} finally {
		if (seq === venueLookupPreviewSeq.value) {
			venueLookupPreviewLoading.value = false;
		}
	}
}

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
					available: availableDates.has(dateText) && dateText >= earliestBorrowDate.value,
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

watch(
	() => [selectedLookupVenueId.value, lookupDates.value.join("|"), borrowEntryMode.value, mode.value],
	() => {
		venueLookupPreviews.value = [];
		venueLookupPreviewError.value = "";
		if (mode.value !== "borrow" || borrowEntryMode.value !== "assetFirst") return;
		if (!selectedLookupVenueId.value || lookupDates.value.length === 0) return;
		void loadVenueLookupPreviews();
	},
);

async function loadHolidays() {
	try {
		const holidays = await sheetsApi.fetchHolidays();
		holidayDates.value = new Set(holidays.map((holiday) => holiday.date));
	} catch {
		// 假日讀取失敗時不阻擋借用流程，僅退回不跳過國定假日的前置天數計算。
	}
}

onMounted(() => {
	void syncDataVersionSnapshot();
	void loadHolidays();
	void rentalStore.loadRecords();
	void rentalStore.loadStudentBlocks();
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
