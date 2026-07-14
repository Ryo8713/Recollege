import type { Asset, VenueAvailability } from "./rental";

export interface BorrowFormState {
	studentId: string;
	studentName: string;
	studentPhone: string;
	studentEmail: string;
	borrowerGroup: string;
	mentorName: string;
	activityName: string;
	borrowedAt: string;
	expectedReturnAt: string;
}

export const EMPTY_BORROW_FORM: BorrowFormState = {
	studentId: "",
	studentName: "",
	studentPhone: "",
	studentEmail: "",
	borrowerGroup: "",
	mentorName: "",
	activityName: "",
	borrowedAt: "",
	expectedReturnAt: "",
};

export interface BorrowConfirmSummary {
	form: BorrowFormState;
	selectedAssetName: string;
	isVenueSelected: boolean;
	selectedVenueSlotLabels: string[];
	venueDurationHours: number;
	borrowDurationDays: number;
}

export interface DateFirstDateRules {
	earliestBorrowDate: string;
}

export interface DateFirstAvailability {
	availableVenues: Asset[];
	availableEquipments: Asset[];
	selectedAssetId: string;
	selectedAssetType: Asset["type"] | "";
	loading: boolean;
	error: string;
}

export interface DateFirstVenueSlots {
	selectedAssetId: string;
	venueAvailabilityLoading: boolean;
	venueAvailabilityError: string;
	venueAvailability: VenueAvailability | null;
	venueStartHours: number[];
	selectedVenueSlotSet: Set<number>;
	selectedVenueSlotLabels: string[];
	venueDurationHours: number;
}

export interface DateFirstEquipmentReturn {
	selectedAssetId: string;
	returnDateLoading: boolean;
	returnDateError: string;
	equipmentReturnDate: string;
	hasNoAvailableReturnDate: boolean;
}

export interface DateFirstSubmitState {
	isStudentBorrowBlocked: boolean;
	submitDisabled: boolean;
}
