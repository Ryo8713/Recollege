<template>
    <div class="space-y-4">
        <nav class="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.99] touch-manipulation"
                :class="activeTab === tab.key
                ? 'border-slate-900 bg-slate-900 text-white shadow'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'"
                @click="activeTab = tab.key"
            >
                {{ tab.label }}
                <span
                v-if="tab.key === 'approvals' && rentalStore.pendingApplications.length > 0"
                class="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white"
                >
                    {{ rentalStore.pendingApplications.length }}
                </span>
                <span
                v-if="tab.key === 'overview' && rentalStore.overdueRecords.length > 0"
                class="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white"
                >
                    {{ rentalStore.overdueRecords.length }}
                </span>
            </button>
        </nav>

        <div v-if="activeTab === 'approvals'" class="space-y-3">
            <p
                v-if="rentalStore.reviewError"
                class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            >
                {{ rentalStore.reviewError }}
            </p>
            <p v-if="rentalStore.pendingApplications.length === 0" class="text-sm text-slate-500">
                目前沒有待審核申請。
            </p>
            <div
                v-if="rentalStore.pendingApplications.length > 0"
                class="flex flex-wrap gap-2"
            >
                <button
                    type="button"
                    class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                    :class="
                        approvalFilter === 'borrow'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    "
                    @click="approvalFilter = 'borrow'"
                >
                    借用申請（{{ pendingBorrowApplications.length }}）
                </button>
                <button
                    type="button"
                    class="rounded-full border px-4 py-2 text-sm font-semibold transition"
                    :class="
                        approvalFilter === 'return'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    "
                    @click="approvalFilter = 'return'"
                >
                    歸還申請（{{ pendingReturnApplications.length }}）
                </button>
            </div>
            <div v-if="rentalStore.pendingApplications.length > 0" class="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2">
                <label class="space-y-1 text-xs font-semibold text-slate-600">
                    <span>財物類型篩選</span>
                    <select
                        v-model="assetFilter"
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none ring-blue-500 focus:ring"
                    >
                        <option value="all">全部（空間＋設備）</option>
                        <option value="venue">僅顯示空間</option>
                        <option value="equipment">僅顯示設備</option>
                    </select>
                </label>
                <label class="space-y-1 text-xs font-semibold text-slate-600">
                    <span>開始借用時間排序</span>
                    <select
                        v-model="borrowDateSort"
                        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none ring-blue-500 focus:ring"
                    >
                        <option value="borrowedAtAsc">開始日近到遠</option>
                        <option value="borrowedAtDesc">開始日遠到近</option>
                    </select>
                </label>
            </div>

            <p
                v-if="
                    rentalStore.pendingApplications.length > 0 &&
                    approvalFilter === 'borrow' &&
                    pendingBorrowApplications.length === 0
                "
                class="text-sm text-slate-500"
            >
                目前沒有待審核借用申請。
            </p>
            <p
                v-if="
                    rentalStore.pendingApplications.length > 0 &&
                    approvalFilter === 'return' &&
                    pendingReturnApplications.length === 0
                "
                class="text-sm text-slate-500"
            >
                目前沒有待審核歸還申請。
            </p>
        <section v-if="approvalFilter === 'borrow' && pendingBorrowApplications.length > 0" class="space-y-2">
            <h3 class="text-sm font-semibold text-blue-900">借用申請（{{ pendingBorrowApplications.length }}）</h3>
            <article
                v-for="app in pendingBorrowApplications"
                :key="app.id"
                class="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm transition hover:shadow-md"
            >
                <div class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900">借用申請</span>
                            <span class="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{{ getAssetTypeLabel(app) }}</span>
                        </div>
                        <p class="text-base font-bold tracking-tight text-slate-900">{{ app.itemName }}</p>
                    </div>
                    <p class="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {{ formatTemporalZh(app.borrowedAt) }} 開始
                    </p>
                </div>
                <dl class="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">申請人</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.studentName }}（{{ app.studentId }}）</dd>
                    </div>
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">聯絡電話</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.studentPhone }}</dd>
                    </div>
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">借用時段</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}</dd>
                    </div>
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">活動 / 團體</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.activityName }} / {{ app.borrowerGroup }}</dd>
                    </div>
                    <div v-if="app.mentorName" class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">負責導師</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.mentorName }}</dd>
                    </div>
                </dl>
                <label class="block space-y-1">
                    <span class="text-xs font-semibold text-slate-500">駁回原因（選填）</span>
                    <textarea
                        v-model.trim="rejectionReasons[app.id]"
                        rows="2"
                        maxlength="200"
                        class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
                        :disabled="rentalStore.isReviewing(app.id)"
                    ></textarea>
                </label>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button
                        type="button"
                        :disabled="rentalStore.isReviewing(app.id)"
                        class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                        @click="handleApprove(app.id)"
                    >
                        核准
                    </button>
                    <button
                        type="button"
                        :disabled="rentalStore.isReviewing(app.id)"
                        class="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                        @click="handleReject(app.id)"
                    >
                        駁回
                    </button>
                </div>
                </div>
            </article>
        </section>

        <section v-if="approvalFilter === 'return' && pendingReturnApplications.length > 0" class="space-y-2">
            <h3 class="text-sm font-semibold text-emerald-900">歸還申請（{{ pendingReturnApplications.length }}）</h3>
            <article
                v-for="app in pendingReturnApplications"
                :key="app.id"
                class="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm transition hover:shadow-md"
            >
                <div class="space-y-3">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">歸還申請</span>
                            <span class="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{{ getAssetTypeLabel(app) }}</span>
                        </div>
                        <p class="text-base font-bold tracking-tight text-slate-900">{{ app.itemName }}</p>
                    </div>
                    <p class="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {{ formatTemporalZh(app.borrowedAt) }} 開始
                    </p>
                </div>
                <dl class="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">申請人</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.studentName }}（{{ app.studentId }}）</dd>
                    </div>
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">聯絡電話</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.studentPhone }}</dd>
                    </div>
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">借用時段</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}</dd>
                    </div>
                    <div class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">活動 / 團體</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.activityName }} / {{ app.borrowerGroup }}</dd>
                    </div>
                    <div v-if="app.mentorName" class="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <dt class="text-xs font-semibold text-slate-500">負責導師</dt>
                        <dd class="mt-0.5 font-semibold text-slate-900">{{ app.mentorName }}</dd>
                    </div>
                </dl>
                <label class="block space-y-1">
                    <span class="text-xs font-semibold text-slate-500">駁回原因（選填）</span>
                    <textarea
                        v-model.trim="rejectionReasons[app.id]"
                        rows="2"
                        maxlength="200"
                        class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
                        :disabled="rentalStore.isReviewing(app.id)"
                    ></textarea>
                </label>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button
                        type="button"
                        :disabled="rentalStore.isReviewing(app.id)"
                        class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                        @click="handleApprove(app.id)"
                    >
                        核准
                    </button>
                    <button
                        type="button"
                        :disabled="rentalStore.isReviewing(app.id)"
                        class="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                        @click="handleReject(app.id)"
                    >
                        駁回
                    </button>
                </div>
                </div>
            </article>
        </section>

        </div>

        <div v-if="activeTab === 'reviewed'" class="space-y-4">
            <p v-if="reviewedApplications.length === 0" class="text-sm text-slate-500">目前沒有已審核紀錄。</p>

            <div v-if="reviewedApplicationMonthSections.length > 0" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label class="block space-y-1 text-sm">
                    <span class="font-bold text-slate-800">選擇月份</span>
                    <select
                        v-model="selectedReviewedMonthKey"
                        class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900 outline-none ring-blue-500 focus:ring md:w-64"
                    >
                        <option
                            v-for="section in reviewedApplicationMonthSections"
                            :key="section.key"
                            :value="section.key"
                        >
                            {{ section.label }}
                        </option>
                    </select>
                </label>
            </div>

            <section
                v-if="selectedReviewedMonthSection"
                class="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm"
            >
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h4 class="font-bold text-slate-900">{{ selectedReviewedMonthSection.label }}</h4>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {{ selectedReviewedMonthSection.apps.length }} 筆
                    </span>
                </div>

                <details
                    v-for="app in selectedReviewedMonthSection.apps"
                    :key="app.id"
                    class="reviewed-card group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
                    :class="getReviewedCardBorderClass(app)"
                >
                    <summary class="cursor-pointer list-none p-4 transition hover:bg-slate-50/80">
                        <div class="flex items-start gap-3">
                            <div class="min-w-0 flex-1 space-y-2.5">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span
                                        class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                                        :class="app.type === '借用申請' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'"
                                    >
                                        {{ app.type }}
                                    </span>
                                    <span
                                        class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                                        :class="app.status === '已核准' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'"
                                    >
                                        {{ app.status }}
                                    </span>
                                </div>
                                <p class="text-base font-bold tracking-tight text-slate-900">{{ getReviewedItemLabel(app) }}</p>
                                <p class="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
                                    {{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}
                                </p>
                                <p class="text-sm font-semibold text-slate-800">
                                    {{ app.studentName }}
                                    <span class="text-slate-500">·</span>
                                    {{ app.studentId }}
                                </p>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-2">
                                <span
                                    class="reviewed-card-chevron flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition group-hover:border-slate-300 group-hover:text-slate-900"
                                    aria-hidden="true"
                                >
                                    ⌄
                                </span>
                                <div class="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs text-white shadow-sm">
                                    <p class="font-medium text-slate-300">審核人</p>
                                    <p class="mt-0.5 font-bold">{{ app.reviewedBy || "未記錄" }}</p>
                                    <p class="mt-1 text-[11px] font-medium text-slate-300">
                                        {{ formatDateZh(app.reviewedAt || "") || "未記錄" }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </summary>

                    <dl class="grid grid-cols-1 gap-2 border-t border-slate-200 bg-slate-50/60 p-4 text-sm md:grid-cols-2">
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">借用項目</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ getReviewedItemLabel(app) }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">申請類型 / 狀態</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.type }} / {{ app.status }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">借用時間</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ formatBorrowPeriodZh(app.borrowedAt, app.expectedReturnAt) }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">借用人</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.studentId }} / {{ app.studentName }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">聯絡電話</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.studentPhone }} / {{ app.studentEmail }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">活動 / 團體</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.activityName }} / {{ app.borrowerGroup }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">負責導師</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.mentorName || "無" }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">申請日期</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ formatTemporalZh(app.createdAt) }}</dd>
                        </div>
                        <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                            <dt class="text-xs font-bold text-slate-700">審核資訊</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.reviewedBy || "未記錄" }} / {{ formatDateZh(app.reviewedAt || "") || "未記錄" }}</dd>
                        </div>
                        <div v-if="app.status === '已駁回'" class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100 md:col-span-2">
                            <dt class="text-xs font-bold text-slate-700">駁回原因</dt>
                            <dd class="mt-0.5 font-bold text-slate-950">{{ app.rejectionReason || "未填寫" }}</dd>
                        </div>
                    </dl>
                </details>
            </section>
        </div>

        <div v-if="activeTab === 'assets'" class="space-y-4">
            <StaffAssetManager />
        </div>

        <div v-if="activeTab === 'rules'" class="space-y-4">
            <BorrowingRulesManager />
        </div>

        <div v-if="activeTab === 'overview'" class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <article class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p class="text-sm text-slate-500">今日待處理申請數</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">{{ todayPendingApplicationsCount }}</p>
            </article>
            <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-sm text-amber-700">今日到期未還數</p>
            <p class="mt-1 text-2xl font-bold text-amber-700">{{ dueTodayUnreturnedCount }}</p>
            </article>
            <article class="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p class="text-sm text-red-700">逾期總數</p>
            <p class="mt-1 text-2xl font-bold text-red-700">{{ overdueTotalCount }}</p>
            </article>
        </div>

        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 class="mb-3 font-semibold text-slate-900">近期風險</h3>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section class="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <h4 class="text-sm font-semibold text-blue-900">24 小時內到期</h4>
                    <p v-if="dueWithin24HoursRecords.length === 0" class="text-xs text-slate-500">目前無項目。</p>
                    <article
                        v-for="record in dueWithin24HoursRecords"
                        :key="`due24-${record.id}`"
                        class="rounded-lg border border-blue-100 bg-white p-2"
                    >
                        <p class="text-sm font-semibold text-slate-900">{{ record.itemName }}</p>
                        <p class="text-xs text-slate-600">{{ record.studentId }} / {{ record.studentName }}</p>
                        <p class="text-xs font-semibold text-blue-800">應還：{{ formatTemporalZh(record.expectedReturnAt) }}</p>
                    </article>
                </section>
                <section class="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                    <h4 class="text-sm font-semibold text-amber-900">待審核歸還申請</h4>
                    <p v-if="pendingReturnApplicationsForRisk.length === 0" class="text-xs text-slate-500">目前無項目。</p>
                    <article
                        v-for="app in pendingReturnApplicationsForRisk"
                        :key="`pending-return-${app.id}`"
                        class="rounded-lg border border-amber-100 bg-white p-2"
                    >
                        <p class="text-sm font-semibold text-slate-900">{{ app.itemName }}</p>
                        <p class="text-xs text-slate-600">{{ app.studentId }} / {{ app.studentName }}</p>
                        <p class="text-xs font-semibold text-amber-800">申請建立：{{ formatDateZh(app.createdAt) }}</p>
                    </article>
                </section>
            </div>
        </div>

        <div class="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <h3 class="mb-3 font-semibold text-red-800">已逾期清單（依逾期天數排序）</h3>
            <p v-if="overdueRecordsSortedByDays.length === 0" class="text-sm text-red-700">目前無逾期項目。</p>
            <article
                v-for="record in overdueRecordsSortedByDays"
                :key="`overdue-${record.id}`"
                class="mb-2 rounded-xl border border-red-100 bg-white p-3"
            >
                <p class="font-semibold text-slate-900">{{ record.itemName }}</p>
                <p class="text-sm text-slate-600">{{ record.studentId }} / {{ record.studentName }}</p>
                <p class="text-sm font-semibold text-red-700">
                    應還：{{ formatTemporalZh(record.expectedReturnAt) }} ｜ 逾期 {{ getOverdueDays(record.expectedReturnAt) }} 天
                </p>
            </article>
        </div>

        <!-- Active records -->
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h3 class="mb-3 font-semibold text-slate-900">租借中紀錄</h3>
            <p v-if="rentalStore.activeRecords.length === 0" class="text-sm text-slate-500">目前無租借中項目。</p>
            <article
            v-for="record in rentalStore.activeRecords"
            :key="record.id"
            class="mb-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
            <p class="font-medium text-slate-900">{{ record.itemName }}</p>
            <p class="text-sm text-slate-600">{{ record.studentId }} / {{ record.studentName }}</p>
            <p class="text-sm text-slate-500">借用：{{ formatTemporalZh(record.borrowedAt) }} ｜ 應還：{{ formatTemporalZh(record.expectedReturnAt) }}</p>
            <p v-if="rentalStore.isOverdue(record)" class="mt-0.5 text-xs font-semibold text-red-700">已逾借</p>
            </article>
        </div>

        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-semibold text-slate-900">新增職員帳號</h3>
                <span class="text-xs font-semibold text-slate-500">目前登入：{{ authStore.staffName || authStore.staffAccount }}</span>
            </div>
            <form class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4" @submit.prevent="handleCreateStaffAccount">
                <input
                    v-model.trim="staffAccountForm.account"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="新職員帳號"
                    maxlength="32"
                    :disabled="staffAccountSubmitting"
                />
                <input
                    v-model.trim="staffAccountForm.name"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="新職員姓名"
                    maxlength="32"
                    :disabled="staffAccountSubmitting"
                />
                <input
                    v-model="staffAccountForm.password"
                    type="password"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="新職員密碼"
                    maxlength="32"
                    :disabled="staffAccountSubmitting"
                />
                <button
                    type="submit"
                    class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="staffAccountSubmitting"
                >
                    {{ staffAccountSubmitting ? "新增中..." : "新增職員帳號" }}
                </button>
            </form>
            <p v-if="staffAccountError" class="mt-2 text-sm font-semibold text-red-700">{{ staffAccountError }}</p>
            <p v-if="staffAccountSuccess" class="mt-2 text-sm font-semibold text-emerald-700">{{ staffAccountSuccess }}</p>
        </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRentalStore } from "../stores/rental";
import { useAuthStore } from "../stores/auth";
import StaffAssetManager from "./StaffAssetManager.vue";
import BorrowingRulesManager from "./BorrowingRulesManager.vue";
import type { BorrowApplication } from "../types/rental";

const rentalStore = useRentalStore();
const authStore = useAuthStore();

type TabKey = "approvals" | "reviewed" | "assets" | "rules" | "overview";
type ApprovalFilterKey = "borrow" | "return";
type AssetFilterKey = "all" | "venue" | "equipment";
type BorrowDateSortKey = "borrowedAtAsc" | "borrowedAtDesc";
const tabs: { key: TabKey; label: string }[] = [
  { key: "approvals", label: "審核申請" },
  { key: "reviewed", label: "已審核紀錄" },
  { key: "assets", label: "財物狀態監控" },
  { key: "rules", label: "借用規則" },
  { key: "overview", label: "管理總覽" },
];

const activeTab = ref<TabKey>("approvals");
const approvalFilter = ref<ApprovalFilterKey>("borrow");
const assetFilter = ref<AssetFilterKey>("all");
const borrowDateSort = ref<BorrowDateSortKey>("borrowedAtAsc");
const staffAccountSubmitting = ref(false);
const staffAccountError = ref("");
const staffAccountSuccess = ref("");
const staffAccountForm = reactive({
  account: "",
  name: "",
  password: "",
});
const rejectionReasons = reactive<Record<string, string>>({});
const selectedReviewedMonthKey = ref("");

const reviewedApplications = computed(() =>
  rentalStore.applications
    .filter((a) => a.status !== "待審核")
    .sort((a, b) => {
      const reviewedDiff = String(b.reviewedAt || "").localeCompare(String(a.reviewedAt || ""));
      if (reviewedDiff !== 0) return reviewedDiff;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    }),
);

const reviewedApplicationMonthSections = computed(() => {
  const byMonth = new Map<string, BorrowApplication[]>();
  for (const app of reviewedApplications.value) {
    const sourceDate = datePart(app.reviewedAt || app.createdAt || app.borrowedAt);
    const key = /^\d{4}-\d{2}/.test(sourceDate) ? sourceDate.slice(0, 7) : "未記錄";
    const apps = byMonth.get(key) ?? [];
    apps.push(app);
    byMonth.set(key, apps);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, apps]) => ({
      key,
      label: formatMonthLabel(key),
      apps,
    }));
});

const selectedReviewedMonthSection = computed(() =>
  reviewedApplicationMonthSections.value.find((section) => section.key === selectedReviewedMonthKey.value) ??
  reviewedApplicationMonthSections.value[0] ??
  null,
);

watch(
  reviewedApplicationMonthSections,
  (sections) => {
    if (sections.length === 0) {
      selectedReviewedMonthKey.value = "";
      return;
    }
    if (!sections.some((section) => section.key === selectedReviewedMonthKey.value)) {
      selectedReviewedMonthKey.value = sections[0].key;
    }
  },
  { immediate: true },
);

function getAssetTypeLabel(app: BorrowApplication): "空間" | "設備" | "未分類" {
  const itemName = String(app.itemName || "").trim();
  if (itemName.startsWith("空間") || itemName.startsWith("場地")) return "空間";
  if (itemName.startsWith("設備") || itemName.startsWith("器材")) return "設備";
  return "未分類";
}

function getItemNameWithoutType(app: BorrowApplication): string {
  return String(app.itemName || "")
    .replace(/^(空間|場地|設備|器材)\s*[:：]\s*/, "")
    .trim() || "未記錄";
}

function getReviewedItemLabel(app: BorrowApplication): string {
  const typeLabel = getAssetTypeLabel(app);
  const itemName = getItemNameWithoutType(app);
  return typeLabel === "未分類" ? itemName : `${itemName}(${typeLabel})`;
}

function getReviewedCardBorderClass(app: BorrowApplication): string {
  if (app.status === "已駁回") return "border-red-200 border-l-4 border-l-red-500";
  if (app.type === "歸還申請") return "border-emerald-200 border-l-4 border-l-emerald-500";
  return "border-blue-200 border-l-4 border-l-blue-500";
}

function matchAssetFilter(app: BorrowApplication): boolean {
  if (assetFilter.value === "all") return true;
  const typeLabel = getAssetTypeLabel(app);
  if (assetFilter.value === "venue") return typeLabel === "空間";
  if (assetFilter.value === "equipment") return typeLabel === "設備";
  return true;
}

function sortByBorrowedAt(apps: BorrowApplication[]): BorrowApplication[] {
  return [...apps].sort((a, b) => {
    const diff = a.borrowedAt.localeCompare(b.borrowedAt);
    if (diff !== 0) {
      return borrowDateSort.value === "borrowedAtAsc" ? diff : -diff;
    }
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

const pendingBorrowApplications = computed(() => {
  const filtered = rentalStore.pendingApplications.filter(
    (a) => a.type === "借用申請" && matchAssetFilter(a),
  );
  return sortByBorrowedAt(filtered);
});

const pendingReturnApplications = computed(() => {
  const filtered = rentalStore.pendingApplications.filter(
    (a) => a.type === "歸還申請" && matchAssetFilter(a),
  );
  return sortByBorrowedAt(filtered);
});

const todayText = computed(() => {
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0")
  );
});

function datePart(value: string): string {
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

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  if (!year || !month) return key;
  return `${year}年${Number(month)}月`;
}

function diffDaysFromToday(targetDateText: string): number {
  const today = new Date(`${todayText.value}T00:00:00`);
  const target = new Date(`${datePart(targetDateText)}T00:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(target.getTime())) return 0;
  return Math.floor((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function getOverdueDays(expectedReturnAt: string): number {
  const days = diffDaysFromToday(expectedReturnAt);
  return days < 0 ? Math.abs(days) : 0;
}

const todayPendingApplicationsCount = computed(() => rentalStore.pendingApplications.length);

const dueTodayUnreturnedCount = computed(
  () => rentalStore.activeRecords.filter((record) => datePart(record.expectedReturnAt) === todayText.value).length,
);

const overdueTotalCount = computed(() => rentalStore.overdueRecords.length);

const dueWithin24HoursRecords = computed(() =>
  rentalStore.activeRecords
    .filter((record) => {
      const days = diffDaysFromToday(record.expectedReturnAt);
      return days >= 0 && days <= 1;
    })
    .sort((a, b) => a.expectedReturnAt.localeCompare(b.expectedReturnAt)),
);

const overdueRecordsSortedByDays = computed(() =>
  [...rentalStore.overdueRecords].sort((a, b) => {
    const overdueDayDiff = getOverdueDays(b.expectedReturnAt) - getOverdueDays(a.expectedReturnAt);
    if (overdueDayDiff !== 0) return overdueDayDiff;
    return a.expectedReturnAt.localeCompare(b.expectedReturnAt);
  }),
);

const pendingReturnApplicationsForRisk = computed(() =>
  rentalStore.pendingApplications
    .filter((app) => app.type === "歸還申請")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
);

async function handleCreateStaffAccount() {
  staffAccountError.value = "";
  staffAccountSuccess.value = "";
  if (!staffAccountForm.account || !staffAccountForm.name || !staffAccountForm.password) {
    staffAccountError.value = "請完整填寫新帳號、姓名與新密碼。";
    return;
  }
  staffAccountSubmitting.value = true;
  try {
    await authStore.createStaffAccount({
      account: staffAccountForm.account.trim(),
      name: staffAccountForm.name.trim(),
      password: staffAccountForm.password,
    });
    staffAccountSuccess.value = `已成功新增職員帳號：${staffAccountForm.name.trim()}（${staffAccountForm.account.trim()}）`;
    staffAccountForm.account = "";
    staffAccountForm.name = "";
    staffAccountForm.password = "";
  } catch (error) {
    staffAccountError.value = error instanceof Error ? error.message : "新增職員帳號失敗。";
  } finally {
    staffAccountSubmitting.value = false;
  }
}

async function handleApprove(applicationId: string) {
  await rentalStore.approveApplication(applicationId, authStore.staffName || authStore.staffAccount);
  delete rejectionReasons[applicationId];
}

async function handleReject(applicationId: string) {
  await rentalStore.rejectApplication(
    applicationId,
    authStore.staffName || authStore.staffAccount,
    rejectionReasons[applicationId] || "",
  );
  delete rejectionReasons[applicationId];
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

function formatTemporalZh(value: string): string {
  const text = String(value || "").trim();
  const dateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(text);
  if (dateTime) {
    const [, y, m, d, hh, mm] = dateTime;
    return `${y}年${Number(m)}月${Number(d)}日 ${hh}:${mm}`;
  }
  return formatDateZh(text);
}

function formatBorrowPeriodZh(start: string, end: string): string {
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
</script>

<style scoped>
.reviewed-card > summary::-webkit-details-marker {
  display: none;
}

.reviewed-card-chevron {
  font-size: 1.125rem;
  line-height: 1;
}

.reviewed-card[open] .reviewed-card-chevron {
  transform: rotate(180deg);
}
</style>
