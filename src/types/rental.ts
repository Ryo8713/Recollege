export type ApplicationType = "借用申請" | "歸還申請";
export type ApplicationStatus = "待審核" | "已核准" | "已駁回";
export type RecordStatus = "待生效" | "租借中" | "已歸還";
export type ReturnRequestStatus = "" | "待審核";
export type AssetType = "venue" | "equipment";
export type ItemType = AssetType | "";
export type AssetStatus = "可租借" | "已借出" | "停用中";

export const ITEM_TYPE_LABELS: Record<AssetType, string> = {
    venue: "空間",
    equipment: "設備",
};

export function getItemTypeLabel(itemType: ItemType): string {
    return itemType ? ITEM_TYPE_LABELS[itemType] : "";
}

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    status: AssetStatus;
    createdAt: string;
}

export interface BorrowApplication {
    id: string;
    type: ApplicationType;
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentEmail: string;
    borrowerGroup: string;
    mentorName: string;
    activityName: string;
    /** 借用項目類型；舊資料若無法判定則為空字串 */
    itemType: ItemType;
    /** 純項目名稱（不含「空間:」等前綴） */
    itemName: string;
    assetId: string;
    borrowedAt: string;
    expectedReturnAt: string;
    status: ApplicationStatus;
    createdAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
    recordId?: string;
    rejectionReason?: string;
}

export interface BorrowRecord {
    id: string;
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentEmail: string;
    borrowerGroup: string;
    mentorName: string;
    activityName: string;
    itemType: ItemType;
    itemName: string;
    assetId: string;
    borrowedAt: string;
    expectedReturnAt: string;
    returnedAt?: string;
    status: RecordStatus;
    returnRequestStatus?: ReturnRequestStatus;
}

export interface StaffAccountSummary {
    account: string;
    name: string;
    createdAt: string;
    createdBy: string;
}

export interface Holiday {
    date: string;
    note: string;
    createdAt: string;
    createdBy: string;
}

export interface GlobalPauseRange {
    id: string;
    startDate: string;
    endDate: string;
    note: string;
    createdAt: string;
    createdBy: string;
}

export interface StudentBlock {
    studentId: string;
    blockedAt: string;
    note: string;
}

/** Raw response from venue-occupied-slots API. */
export interface VenueOccupiedSlots {
    occupied: Array<{ start: number; end: number }>;
}

/** Enriched venue day availability used by the borrow UI. */
export interface VenueAvailability {
    assetId: string;
    date: string;
    openStart: number;
    openEnd: number;
    isHoliday: boolean;
    occupied: Array<{ start: number; end: number }>;
}
