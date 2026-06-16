import type {
    Asset,
    AssetType,
    BorrowApplication,
    BorrowRecord,
    Holiday,
    GlobalPauseRange,
    StaffAccountSummary,
    StaffRole,
    VenueAvailability,
} from "../types/rental";

const API_BASE_URL = import.meta.env.VITE_SHEETS_API_URL as string | undefined;

interface ReviewBorrowApplicationPayload {
    applicationId: string;
    action: "approve" | "reject";
    staffName: string;
    rejectionReason?: string;
}

interface AvailabilityResponse {
    venues: Asset[];
    equipments: Asset[];
}

interface AssetAvailabilityDatesResponse {
    assetId: string;
    fromDate: string;
    dates: string[];
}

interface AvailableReturnDatesResponse {
    assetId: string;
    borrowedAt: string;
    dates: string[];
}

interface AssetBlockedRangesResponse {
    today: string;
    blockedRangesByAssetId: Record<string, Array<{ start: string; end: string }>>;
    globalPauseRanges?: Array<{ start: string; end: string }>;
}

interface AssetPauseRange {
    id: string;
    assetId: string;
    startDate: string;
    endDate: string;
    note: string;
    createdAt: string;
}

interface DataVersionResponse {
    version: string;
}

interface StaffLoginResponse {
    ok: boolean;
    account: string;
    name: string;
    role: StaffRole;
}

export function hasApiBaseUrl(): boolean {
    return Boolean(API_BASE_URL?.trim());
}

function buildApiUrl(path: string, query?: Record<string, string | undefined>): string {
    const baseUrl = API_BASE_URL?.trim();
    if (!baseUrl) {
        throw new Error("尚未設定 API_BASE_URL,無法連線至Google sheet");
    }

    const base = baseUrl.replace(/\/$/, ""); // Remove any "/" from the baseUrl to ensure consistent URL formatting
    const url = new URL(base);
    url.searchParams.set("path", path.replace(/^\//, ""));
    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value != null && value !== "") {
                url.searchParams.set(key, value);
            }
        });
    }
    return url.toString();
}

async function request<T>(path: string, init?: RequestInit, query?: Record<string, string | undefined>): Promise<T> {
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);

    if (init?.body && method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "text/plain;charset=utf-8");
    }

    let response: Response;
    try {
        const { headers: _ignored, ...rest } = init ?? {};
        response = await fetch(buildApiUrl(path, query), {
            ...rest,
            method,
            headers,
            mode: "cors",
            redirect: "follow",
        });
    } catch (error) {
        throw new Error(
            error instanceof Error
                ? `無法連線至 Google Apps Script:${error.message}（請確認 Web App 已部署且存取權為「任何人」）`
                : "無法連線至 Google Apps Script",
        );
    }

    const text = await response.text();
    let data: T & { error?: string };
    try {
        data = JSON.parse(text) as T & { error?: string };
    } catch {
        throw new Error("API 回傳非 JSON,請確認 VITE_SHEETS_API_URL 是否為正確的 /exec 部署網址");
    }

    if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
    }

    if (!response.ok) {
        throw new Error(`API ${response.status}: ${path}`);
    }

    return data as T;
}

export const sheetsApi = {
    hasApiBaseUrl,

    async fetchAssets(): Promise<Asset[]> {
        return request<Asset[]>("assets");
    },

    async fetchBorrowApplications(): Promise<BorrowApplication[]> {
        return request<BorrowApplication[]>("borrow-applications");
    },

    async fetchBorrowRecords(): Promise<BorrowRecord[]> {
        return request<BorrowRecord[]>("borrow-records");
    },

    async fetchAvailabilityByStartDate(borrowedAt: string): Promise<AvailabilityResponse> {
        return request<AvailabilityResponse>("availability", undefined, { borrowedAt });
    },

    async fetchAssetAvailabilityDates(
        assetId: string,
        fromDate: string,
        windowDays = 30,
    ): Promise<AssetAvailabilityDatesResponse> {
        return request<AssetAvailabilityDatesResponse>("asset-availability-dates", undefined, {
            assetId,
            fromDate,
            windowDays: String(windowDays),
        });
    },

    async fetchAvailableReturnDates(assetId: string, borrowedAt: string): Promise<AvailableReturnDatesResponse> {
        return request<AvailableReturnDatesResponse>("available-return-dates", undefined, {
            assetId,
            borrowedAt,
        });
    },

    async fetchAssetBlockedRanges(): Promise<AssetBlockedRangesResponse> {
        return request<AssetBlockedRangesResponse>("asset-blocked-ranges");
    },

    async fetchAssetPauseRanges(): Promise<AssetPauseRange[]> {
        return request<AssetPauseRange[]>("asset-pauses");
    },

    async fetchHolidays(): Promise<Holiday[]> {
        return request<Holiday[]>("holidays");
    },

    async createHoliday(payload: {
        operatorAccount: string;
        date: string;
        note?: string;
    }): Promise<{ ok: boolean; date: string; note: string; createdAt: string; createdBy: string }> {
        return request("holidays", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async deleteHoliday(payload: { operatorAccount: string; date: string }): Promise<{ ok: boolean; date: string }> {
        return request("holiday-deletes", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async fetchGlobalPauseRanges(): Promise<GlobalPauseRange[]> {
        return request<GlobalPauseRange[]>("global-pauses");
    },

    async createGlobalPauseRange(payload: {
        operatorAccount: string;
        startDate: string;
        endDate: string;
        note?: string;
    }): Promise<GlobalPauseRange> {
        return request<GlobalPauseRange>("global-pauses", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async deleteGlobalPauseRange(payload: { operatorAccount: string; id: string }): Promise<{ ok: boolean; id: string }> {
        return request("global-pause-deletes", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async fetchVenueAvailability(assetId: string, date: string): Promise<VenueAvailability> {
        return request<VenueAvailability>("venue-availability", undefined, { assetId, date });
    },

    async createAssetPauseRange(payload: {
        assetId: string;
        startDate: string;
        endDate: string;
        note?: string;
    }): Promise<AssetPauseRange> {
        return request<AssetPauseRange>("asset-pauses", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async fetchDataVersion(): Promise<DataVersionResponse> {
        return request<DataVersionResponse>("data-version");
    },

    async fetchStaffAccounts(): Promise<StaffAccountSummary[]> {
        return request<StaffAccountSummary[]>("staff-accounts");
    },

    async createAsset(payload: { name: string; type: AssetType }): Promise<{ assetId: string }> {
        return request<{ assetId: string }>("assets", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async deleteAsset(payload: { operatorAccount: string; assetId: string }): Promise<{ ok: boolean; assetId: string; name: string }> {
        return request<{ ok: boolean; assetId: string; name: string }>("asset-deletes", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async loginStaff(payload: { account: string; password: string }): Promise<StaffLoginResponse> {
        return request<StaffLoginResponse>("staff-login", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async createStaffAccount(payload: {
        operatorAccount: string;
        account: string;
        name: string;
        password: string;
    }): Promise<{ ok: boolean; account: string; name: string }> {
        return request<{ ok: boolean; account: string; name: string }>("staff-accounts", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async createBorrowApplication(
        payload: Omit<BorrowApplication, "id" | "createdAt" | "status" | "reviewedBy" | "reviewedAt" | "rejectionReason">,
    ): Promise<{ ok: boolean; applicationId: string }> {
        return request<{ ok: boolean; applicationId: string }>("borrow-applications", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async reviewBorrowApplication(
        payload: ReviewBorrowApplicationPayload,
    ): Promise<{ ok: boolean; applicationId: string; status: string; recordId?: string }> {
        return request<{ ok: boolean; applicationId: string; status: string; recordId?: string }>(
            "borrow-application-reviews",
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
        );
    },
};
