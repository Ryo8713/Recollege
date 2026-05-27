export type ApplicationType = "借用申請" | "歸還申請";
export type ApplicationStatus = "待審核" | "已核准" | "已駁回";
export type RecordStatus = "待生效" | "租借中" | "已歸還";
export type ReturnRequestStatus = "" | "待審核";
export type AssetType = "venue" | "equipment";
export type AssetStatus = "可租借" | "已借出" | "停用中";
export type StaffRole = "admin" | "staff";

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
    itemName: string;
    assetIds: string[];
    borrowedAt: string;
    expectedReturnAt: string;
    status: ApplicationStatus;
    createdAt: string;
    reviewedBy?: string;
    reviewedAt?: string;
    recordId?: string;
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
    itemName: string;
    assetIds: string[];
    borrowedAt: string;
    expectedReturnAt: string;
    returnedAt?: string;
    status: RecordStatus;
    returnRequestStatus?: ReturnRequestStatus;
}

export interface StaffAccountSummary {
    account: string;
    role: StaffRole;
    status: "active";
    createdAt: string;
    createdBy: string;
}
