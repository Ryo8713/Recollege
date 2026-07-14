<template>

	<section class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

		<ActionFeedbackModal

			v-bind="feedback"

			@close="closeFeedback"

		/>



		<BorrowConfirmModal

			v-if="borrowConfirmSummary"

			:visible="showBorrowConfirmModal"

			:submitting="isSubmitting"

			:summary="borrowConfirmSummary"

			@cancel="closeBorrowConfirmModal"

			@confirm="submitBorrow"

		/>



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



		<RemoteDataUpdateBanner

			:visible="hasRemoteUpdate"

			:refreshing="isRefreshingLatestData"

			@dismiss="dismissRemoteUpdate"

			@refresh="refreshLatestData"

		/>



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



			<BorrowDateFirstPanel

				v-if="borrowEntryMode === 'dateFirst'"

				:form="form"

				v-bind="dateFirstPanelProps"

				@select-asset="selectAsset"

				@toggle-slot="toggleVenueSlot"

				@submit="openBorrowConfirmModal"

			/>



			<BorrowAssetFirstPanel

				v-else

				v-bind="assetFirstPanelProps"

				@update:selected-lookup-venue-id="onLookupVenueIdChange"

				@update:selected-lookup-equipment-id="onLookupEquipmentIdChange"

				@apply-date="applySuggestedBorrowDate"

			/>



			<p v-if="borrowError" class="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">

				{{ borrowError }}

			</p>

		</div>



		<StudentReturnPanel

			v-if="mode === 'return'"

			v-model:return-search-id="returnSearchId"

			v-model:selected-return-ids="selectedReturnIds"

			v-bind="returnPanelProps"

			@search="searchReturn"

			@submit="submitReturn"

		/>

	</section>

</template>



<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, type Ref } from "vue";
import ActionFeedbackModal from "./ActionFeedbackModal.vue";
import BorrowAssetFirstPanel from "./student-borrow/BorrowAssetFirstPanel.vue";
import BorrowConfirmModal from "./student-borrow/BorrowConfirmModal.vue";
import BorrowDateFirstPanel from "./student-borrow/BorrowDateFirstPanel.vue";
import RemoteDataUpdateBanner from "./student-borrow/RemoteDataUpdateBanner.vue";
import StudentReturnPanel from "./student-borrow/StudentReturnPanel.vue";
import { useAssetFirstLookupPanel } from "../composables/useAssetFirstLookupPanel";
import { useBorrowAvailability } from "../composables/useBorrowAvailability";
import { useBorrowSubmit } from "../composables/useBorrowSubmit";
import { useDataVersionPoll } from "../composables/useDataVersionPoll";
import { useDateFirstBorrowPanel } from "../composables/useDateFirstBorrowPanel";
import { useHolidays } from "../composables/useHolidays";
import { useReturnSearch } from "../composables/useReturnSearch";
import { useSubmitFeedback } from "../composables/useSubmitFeedback";
import { useAssetsStore } from "../stores/assets";
import { useRentalStore } from "../stores/rental";
import { EMPTY_BORROW_FORM } from "../types/borrowForm";
import { getTodayText } from "../utils/date";

const assetsStore = useAssetsStore();
const rentalStore = useRentalStore();
const { assets } = storeToRefs(assetsStore);

const today = getTodayText();
const mode = ref<"borrow" | "return">("borrow");
const borrowEntryMode = ref<"dateFirst" | "assetFirst">("dateFirst");
const { holidayDates, loadHolidays } = useHolidays();



const form = reactive({ ...EMPTY_BORROW_FORM });

const borrowError = ref("");

const {

	feedback,

	isSubmitting,

	close: closeFeedback,

	startLoading,

	showSuccess,

	showError,

} = useSubmitFeedback();



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



const isStudentBorrowBlocked = computed(() => rentalStore.isStudentBorrowRestricted(form.studentId));



const {

	panelProps: dateFirstPanelProps,

	earliestBorrowDate,

	isVenueSelected,

	selectedVenueSlotHours,

	selectedVenueStartHour,

	selectedVenueEndHour,

	selectedVenueSlotLabels,

	venueDurationHours,

	hasNoAvailableReturnDate,

	toggleVenueSlot,

	resetVenueSlots,

} = useDateFirstBorrowPanel({

	form,

	today,

	holidayDates,

	isSubmitting,

	isStudentBorrowBlocked,

	selectedAssetId,

	selectedAssetType,

	availableVenues,

	availableEquipments,

	availabilityLoading,

	availabilityError,

	availableReturnDates,

	returnDateLoading,

	returnDateError,

	venueAvailability,

	venueAvailabilityLoading,

	venueAvailabilityError,

	venueStartHours,

});



const {

	panelProps: assetFirstPanelProps,

	onLookupVenueIdChange,

	onLookupEquipmentIdChange,

} = useAssetFirstLookupPanel({

	assets,

	form,

	mode,

	borrowEntryMode,

	earliestBorrowDate,

	selectedLookupAssetId,

	lookupDates,

	lookupLoading,

	lookupError,

	fetchVenueAvailabilityCached,

});



const remoteRefreshContext: {

	returnSearchId?: Ref<string>;

	searchReturn?: () => Promise<void>;

} = {};



const {

	hasRemoteUpdate,

	isRefreshingLatestData,

	syncDataVersionSnapshot,

	dismissRemoteUpdate,

	refreshLatestData,

} = useDataVersionPoll({

	onRefresh: async () => {

		await Promise.all([

			assetsStore.loadAssets({ force: true }),

			rentalStore.loadRecords({ force: true }),

			rentalStore.loadStudentBlocks({ force: true }),

		]);

		await refreshBorrowAvailability();

		if (remoteRefreshContext.returnSearchId?.value) {

			await remoteRefreshContext.searchReturn?.();

		}

	},

});



const {

	returnSearchId,

	selectedReturnIds,

	panelProps: returnPanelProps,

	searchReturn,

	submitReturn,

} = useReturnSearch(

	{ startLoading, showSuccess, showError },

	{

		isSubmitting,

		onSubmitted: () => {

			clearAvailabilityCaches();

			void ensureBlockedRangesLoaded(true);

		},

		syncDataVersion: () => syncDataVersionSnapshot(),

	},

);



remoteRefreshContext.returnSearchId = returnSearchId;

remoteRefreshContext.searchReturn = searchReturn;



const {

	showBorrowConfirmModal,

	borrowConfirmSummary,

	closeBorrowConfirmModal,

	openBorrowConfirmModal,

	submitBorrow,

} = useBorrowSubmit({

	form,

	borrowError,

	rentalStore,

	assets,

	submitFeedback: { startLoading, showSuccess, showError },

	syncDataVersion: () => syncDataVersionSnapshot(),

	holidayDates,

	isStudentBorrowBlocked,

	selectedAssetId,

	selectedAssetType,

	availableReturnDates,

	availabilityLoading,

	clearAvailabilityCaches,

	ensureBlockedRangesLoaded,

	resetVenueSlots,

	earliestBorrowDate,

	isVenueSelected,

	selectedVenueSlotHours,

	selectedVenueStartHour,

	selectedVenueEndHour,

	selectedVenueSlotLabels,

	venueDurationHours,

	venueStartHours,

	hasNoAvailableReturnDate,

});



onMounted(() => {

	void Promise.all([loadHolidays(), rentalStore.loadStudentBlocks()]);

});

</script>


