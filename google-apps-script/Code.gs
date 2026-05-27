const SHEET_ASSETS = "assets";
const SHEET_ASSET_PAUSES = "asset_pause_ranges";
const SHEET_BORROW_APPLICATIONS = "borrow_applications";
const SHEET_BORROW_RECORDS = "borrow_records";
const SHEET_STAFF_ACCOUNTS = "staff_accounts";
const ASSET_HEADERS = ["id", "name", "type", "status", "createdAt"];
const ASSET_PAUSE_HEADERS = ["id", "assetId", "startDate", "endDate", "note", "createdAt"];
const BORROW_APPLICATION_HEADERS = [
  "id",
  "type",
  "studentId",
  "studentName",
  "studentPhone",
  "studentEmail",
  "itemName",
  "assetIds",
  "borrowedAt",
  "expectedReturnAt",
  "status",
  "createdAt",
  "reviewedBy",
  "reviewedAt",
  "recordId",
  "borrowerGroup",
  "mentorName",
  "activityName",
];
const BORROW_RECORD_HEADERS = [
  "id",
  "studentId",
  "studentName",
  "studentPhone",
  "studentEmail",
  "itemName",
  "assetIds",
  "borrowedAt",
  "expectedReturnAt",
  "returnedAt",
  "status",
  "returnRequestStatus",
  "borrowerGroup",
  "mentorName",
  "activityName",
];
const VALID_TYPES = ["venue", "equipment"];
const VALID_STATUS = ["可租借", "已借出", "停用中"];
const VALID_APPLICATION_TYPES = ["借用申請", "歸還申請"];
const VALID_APPLICATION_STATUS = ["待審核", "已核准", "已駁回"];
const VALID_RECORD_STATUS = ["待生效", "租借中", "已歸還"];
const STAFF_ACCOUNT_HEADERS = ["account", "password", "role", "status", "createdAt", "createdBy"];
const STAFF_ACCOUNT_STATUS_ACTIVE = "active";
const STAFF_ACCOUNT_DEFAULT_ADMIN = "admin";
const STAFF_ACCOUNT_DEFAULT_ADMIN_PASSWORD = "1234";
const APP_TIME_ZONE = "Asia/Taipei";
const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATA_VERSION_KEY = "dataVersion";
const FAR_FUTURE_BLOCKED_END_DATE = "9999-12-31";

function doGet(e) {
  return routeRequest_("GET", e);
}

function doPost(e) {
  return routeRequest_("POST", e);
}

function routeRequest_(method, e) {
  try {
    const path = getPath_(e);

    if (path === "borrow-applications" && method === "GET") {
      return jsonResponse_(readBorrowApplications_());
    }

    if (path === "borrow-records" && method === "GET") {
      return jsonResponse_(readBorrowRecords_());
    }

    if (path === "assets" && method === "GET") {
      return jsonResponse_(readAssets_());
    }

    if (path === "staff-accounts" && method === "GET") {
      return jsonResponse_(readStaffAccounts_());
    }

    if (path === "asset-pauses" && method === "GET") {
      return jsonResponse_(readAssetPauseRanges_());
    }

    if (path === "staff-login" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(verifyStaffLogin_(body));
    }

    if (path === "availability" && method === "GET") {
      const borrowedAt = requireField_(e && e.parameter && e.parameter.borrowedAt, "borrowedAt");
      return jsonResponse_(listAvailableAssetsByStartDate_(borrowedAt));
    }

    if (path === "asset-availability-dates" && method === "GET") {
      const assetId = requireField_(e && e.parameter && e.parameter.assetId, "assetId");
      const fromDate = String((e && e.parameter && e.parameter.fromDate) || getTodayText_()).trim();
      const windowDays = parsePositiveInt_(
        e && e.parameter && e.parameter.windowDays,
        "windowDays"
      );
      return jsonResponse_(listAssetAvailableDates_(assetId, fromDate, windowDays));
    }

    if (path === "available-return-dates" && method === "GET") {
      const assetId = requireField_(e && e.parameter && e.parameter.assetId, "assetId");
      const borrowedAt = requireField_(e && e.parameter && e.parameter.borrowedAt, "borrowedAt");
      return jsonResponse_(listAvailableReturnDates_(assetId, borrowedAt));
    }

    if (path === "asset-blocked-ranges" && method === "GET") {
      return jsonResponse_(listAssetBlockedRanges_());
    }

    if (path === "data-version" && method === "GET") {
      return jsonResponse_({ version: getDataVersion_() });
    }

    if (path === "assets" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createAsset_(body));
    }

    if (path === "asset-pauses" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createAssetPauseRange_(body));
    }

    if (path === "staff-accounts" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createStaffAccount_(body));
    }

    if (path === "borrow-applications" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createBorrowApplication_(body));
    }

    if (path === "borrow-application-reviews" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(reviewBorrowApplication_(body));
    }

    return jsonResponse_({ error: "Not Found", path: path }, 404);
  } catch (err) {
    return jsonResponse_({ error: String(err.message || err) }, 500);
  }
}

function getPath_(e) {
  const raw = (e && e.parameter && e.parameter.path) || "";
  return String(raw).replace(/^\//, "").trim();
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  return JSON.parse(e.postData.contents);
}

function jsonResponse_(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
  // GAS Web App 無法自訂 HTTP status，前端以 JSON error 欄位判斷
  if (statusCode && statusCode >= 400) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: data.error || "Error", status: statusCode })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  return output;
}

function getAssetsSheet_() {
  return getSheetWithHeaders_(SHEET_ASSETS, ASSET_HEADERS);
}

function getAssetPauseSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_ASSET_PAUSES, ASSET_PAUSE_HEADERS);
  ensureColumnAsDateText_(sheet, 3); // startDate
  ensureColumnAsDateText_(sheet, 4); // endDate
  return sheet;
}

function getBorrowApplicationsSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_BORROW_APPLICATIONS, BORROW_APPLICATION_HEADERS);
  ensureColumnAsText_(sheet, 5); // studentPhone
  ensureColumnAsDateText_(sheet, 9); // borrowedAt
  ensureColumnAsDateText_(sheet, 10); // expectedReturnAt
  return sheet;
}

function getBorrowRecordsSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_BORROW_RECORDS, BORROW_RECORD_HEADERS);
  ensureColumnAsText_(sheet, 4); // studentPhone
  ensureColumnAsDateText_(sheet, 8); // borrowedAt
  ensureColumnAsDateText_(sheet, 9); // expectedReturnAt
  return sheet;
}

function getStaffAccountsSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_STAFF_ACCOUNTS, STAFF_ACCOUNT_HEADERS);
  ensureDefaultStaffAccount_(sheet);
  return sheet;
}

function getSheetWithHeaders_(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    ensureHeaders_(sheet, headers);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = headers.some(function (h, i) {
    return String(firstRow[i] || "").trim() !== h;
  });

  if (sheet.getLastRow() === 0 || needsHeader) {
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    sheet.setFrozenRows(1);
  }
}

function readAssets_() {
  const sheet = getAssetsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, ASSET_HEADERS.length).getValues();
  const assets = [];

  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[0] || "").trim();
    if (!id) continue;

    assets.push({
      id: id,
      name: String(row[1] || "").trim(),
      type: String(row[2] || "").trim(),
      status: normalizeAssetStatus_(row[3]),
      createdAt: String(row[4] || "").trim(),
    });
  }

  return assets;
}

function createAsset_(body) {
  const name = String((body && body.name) || "").trim();
  const type = String((body && body.type) || "").trim();

  if (!name) {
    throw new Error("name 為必填");
  }
  if (VALID_TYPES.indexOf(type) === -1) {
    throw new Error(`type 錯誤，收到：[${type}]`);
  }

  const sheet = getAssetsSheet_();
  const assetId = generateAssetId_(type);
  const createdAt = new Date().toISOString();
  const status = "可租借";

  sheet.appendRow([assetId, name, type, status, createdAt]);
  bumpDataVersion_();

  return { assetId: assetId };
}

function readAssetPauseRanges_() {
  const sheet = getAssetPauseSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, ASSET_PAUSE_HEADERS.length).getValues();
  const ranges = [];
  for (var i = 0; i < rows.length; i++) {
    const id = String(rows[i][0] || "").trim();
    const assetId = String(rows[i][1] || "").trim();
    const startDate = normalizeDateText_(rows[i][2]);
    const endDate = normalizeDateText_(rows[i][3]);
    if (!id || !assetId || !startDate || !endDate) continue;
    ranges.push({
      id: id,
      assetId: assetId,
      startDate: startDate,
      endDate: endDate,
      note: String(rows[i][4] || "").trim(),
      createdAt: String(rows[i][5] || "").trim(),
    });
  }
  return ranges;
}

function createAssetPauseRange_(body) {
  const assetId = requireField_(body && body.assetId, "assetId");
  const startDate = requireDateText_(body && body.startDate, "startDate");
  const endDate = requireDateText_(body && body.endDate, "endDate");
  const note = String((body && body.note) || "").trim();
  if (endDate < startDate) {
    throw new Error("endDate 不可早於 startDate");
  }
  if (note.length > 60) {
    throw new Error("note 最多 60 字");
  }
  const assets = readAssets_();
  const target = assets.find(function (asset) {
    return asset.id === assetId;
  });
  if (!target) {
    throw new Error("找不到資產：" + assetId);
  }
  ensurePauseRangeNoBorrowConflict_(assetId, startDate, endDate);

  const sheet = getAssetPauseSheet_();
  const id = "pause-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const createdAt = new Date().toISOString();
  sheet.appendRow([id, assetId, startDate, endDate, note, createdAt]);
  bumpDataVersion_();
  return {
    id: id,
    assetId: assetId,
    startDate: startDate,
    endDate: endDate,
    note: note,
    createdAt: createdAt,
  };
}

function normalizeAssetStatus_(rawStatus) {
  const status = String(rawStatus || "").trim();
  if (!status || status === "可租借") return "可租借";
  if (status === "已借出") return "已借出";
  if (status === "停用中" || status === "維修中") return "停用中";
  return "可租借";
}

function ensurePauseRangeNoBorrowConflict_(assetId, pauseStartDate, pauseEndDate) {
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][10] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = normalizeDateText_(rows[i][7]);
    const expectedReturnAt = normalizeDateText_(rows[i][8]);
    if (!borrowedAt || !expectedReturnAt) continue;
    const assetIds = parseStringArray_(rows[i][6]);
    if (assetIds.indexOf(assetId) < 0) continue;
    if (isDateRangeOverlapping_(borrowedAt, expectedReturnAt, pauseStartDate, pauseEndDate)) {
      throw new Error(
        "暫停出借時段與既有借用紀錄重疊：" +
          borrowedAt +
          " 至 " +
          expectedReturnAt +
          "，請先調整暫停時段。"
      );
    }
  }
}

function readStaffAccounts_() {
  const sheet = getStaffAccountsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, STAFF_ACCOUNT_HEADERS.length).getValues();
  const accounts = [];
  for (var i = 0; i < rows.length; i++) {
    const account = String(rows[i][0] || "").trim();
    const status = String(rows[i][3] || STAFF_ACCOUNT_STATUS_ACTIVE).trim();
    if (!account || status !== STAFF_ACCOUNT_STATUS_ACTIVE) continue;
    accounts.push({
      account: account,
      role: String(rows[i][2] || "staff").trim(),
      status: status,
      createdAt: String(rows[i][4] || "").trim(),
      createdBy: String(rows[i][5] || "").trim(),
    });
  }
  return accounts;
}

function verifyStaffLogin_(body) {
  const account = requireField_(body && body.account, "account");
  const password = requireField_(body && body.password, "password");
  const staff = findStaffAccount_(account);
  if (!staff || staff.status !== STAFF_ACCOUNT_STATUS_ACTIVE || staff.password !== password) {
    throw new Error("帳號或密碼錯誤，請重新輸入。");
  }
  return {
    ok: true,
    account: staff.account,
    role: staff.role,
  };
}

function createStaffAccount_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const account = requireField_(body && body.account, "account");
  const password = requireField_(body && body.password, "password");

  const operator = findStaffAccount_(operatorAccount);
  if (!operator || operator.status !== STAFF_ACCOUNT_STATUS_ACTIVE) {
    throw new Error("職員帳號驗證失敗。");
  }
  if (password.length < 4) {
    throw new Error("新密碼至少需 4 碼。");
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(account)) {
    throw new Error("帳號僅允許英數與 . _ - 字元。");
  }

  const existed = findStaffAccount_(account);
  if (existed && existed.status === STAFF_ACCOUNT_STATUS_ACTIVE) {
    throw new Error("帳號已存在，請使用其他帳號。");
  }

  const sheet = getStaffAccountsSheet_();
  const createdAt = new Date().toISOString();
  sheet.appendRow([account, password, "staff", STAFF_ACCOUNT_STATUS_ACTIVE, createdAt, operator.account]);
  return { ok: true, account: account };
}

function findStaffAccount_(account) {
  const target = String(account || "").trim();
  if (!target) return null;
  const sheet = getStaffAccountsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, STAFF_ACCOUNT_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const currentAccount = String(rows[i][0] || "").trim();
    if (currentAccount !== target) continue;
    return {
      account: currentAccount,
      password: String(rows[i][1] || "").trim(),
      role: String(rows[i][2] || "staff").trim(),
      status: String(rows[i][3] || STAFF_ACCOUNT_STATUS_ACTIVE).trim(),
      createdAt: String(rows[i][4] || "").trim(),
      createdBy: String(rows[i][5] || "").trim(),
    };
  }
  return null;
}

function ensureDefaultStaffAccount_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.appendRow([
      STAFF_ACCOUNT_DEFAULT_ADMIN,
      STAFF_ACCOUNT_DEFAULT_ADMIN_PASSWORD,
      "admin",
      STAFF_ACCOUNT_STATUS_ACTIVE,
      new Date().toISOString(),
      "system",
    ]);
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, STAFF_ACCOUNT_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === STAFF_ACCOUNT_DEFAULT_ADMIN) {
      return;
    }
  }
  sheet.appendRow([
    STAFF_ACCOUNT_DEFAULT_ADMIN,
    STAFF_ACCOUNT_DEFAULT_ADMIN_PASSWORD,
    "admin",
    STAFF_ACCOUNT_STATUS_ACTIVE,
    new Date().toISOString(),
    "system",
  ]);
}

function readBorrowApplications_() {
  const sheet = getBorrowApplicationsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_APPLICATION_HEADERS.length).getValues();
  const applications = [];

  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[0] || "").trim();
    if (!id) continue;

    const type = String(row[1] || "").trim();
    if (VALID_APPLICATION_TYPES.indexOf(type) === -1) continue;

    const status = String(row[10] || "").trim();
    const recordId = String(row[14] || "").trim();
    const reviewedBy = String(row[12] || "").trim();
    const reviewedAt = String(row[13] || "").trim();

    const app = {
      id: id,
      type: type,
      studentId: String(row[2] || "").trim(),
      studentName: String(row[3] || "").trim(),
      studentPhone: normalizePhoneText_(row[4]),
      studentEmail: String(row[5] || "").trim(),
      itemName: String(row[6] || "").trim(),
      assetIds: parseStringArray_(row[7]),
      borrowedAt: normalizeDateText_(row[8]),
      expectedReturnAt: normalizeDateText_(row[9]),
      status: VALID_APPLICATION_STATUS.indexOf(status) >= 0 ? status : "待審核",
      createdAt: String(row[11] || "").trim(),
      borrowerGroup: String(row[15] || "").trim(),
      mentorName: String(row[16] || "").trim(),
      activityName: String(row[17] || "").trim(),
    };

    if (reviewedBy) app.reviewedBy = reviewedBy;
    if (reviewedAt) app.reviewedAt = reviewedAt;
    if (recordId) app.recordId = recordId;
    applications.push(app);
  }

  return applications;
}

function readBorrowRecords_() {
  // Ensure date-based statuses (待生效/租借中) are refreshed on read,
  // so records don't stay stale when daily trigger hasn't run yet.
  const reconcileResult = reconcileBorrowingState_();
  if (reconcileResult.hasMeaningfulUpdates) {
    bumpDataVersion_();
  }

  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  const records = [];

  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[0] || "").trim();
    if (!id) continue;

    const status = String(row[10] || "").trim();
    if (VALID_RECORD_STATUS.indexOf(status) === -1) continue;

    const returnedAt = normalizeDateText_(row[9]);
    const returnRequestStatus = String(row[11] || "").trim();
    const record = {
      id: id,
      studentId: String(row[1] || "").trim(),
      studentName: String(row[2] || "").trim(),
      studentPhone: normalizePhoneText_(row[3]),
      studentEmail: String(row[4] || "").trim(),
      itemName: String(row[5] || "").trim(),
      assetIds: parseStringArray_(row[6]),
      borrowedAt: normalizeDateText_(row[7]),
      expectedReturnAt: normalizeDateText_(row[8]),
      status: status,
      returnRequestStatus: returnRequestStatus === "待審核" ? "待審核" : "",
      borrowerGroup: String(row[12] || "").trim(),
      mentorName: String(row[13] || "").trim(),
      activityName: String(row[14] || "").trim(),
    };
    if (returnedAt) record.returnedAt = returnedAt;
    records.push(record);
  }

  return records;
}

function createBorrowApplication_(body) {
  const type = String((body && body.type) || "").trim();
  if (VALID_APPLICATION_TYPES.indexOf(type) === -1) {
    throw new Error("type 必須為 借用申請 或 歸還申請");
  }

  const studentId = requireField_(body && body.studentId, "studentId");
  const studentName = requireField_(body && body.studentName, "studentName");
  const studentPhone = normalizePhoneText_(requireField_(body && body.studentPhone, "studentPhone"));
  const studentEmail = requireField_(body && body.studentEmail, "studentEmail");
  const itemName = requireField_(body && body.itemName, "itemName");
  const borrowerGroup = String((body && body.borrowerGroup) || "").trim();
  const mentorName = String((body && body.mentorName) || "").trim();
  const activityName = String((body && body.activityName) || "").trim();
  const borrowedAt = requireDateText_(body && body.borrowedAt, "borrowedAt");
  const expectedReturnAt = requireDateText_(body && body.expectedReturnAt, "expectedReturnAt");
  ensureDateRange_(borrowedAt, expectedReturnAt);
  const assetIds = normalizeIdArray_(body && body.assetIds, "assetIds");
  const recordId = String((body && body.recordId) || "").trim();

  if (type === "借用申請") {
    ensureDateOnOrAfterToday_(borrowedAt, "borrowedAt");
    if (!borrowerGroup) {
      throw new Error("borrowerGroup 為必填");
    }
    if (!activityName) {
      throw new Error("activityName 為必填");
    }
    ensureAssetsAvailableForPeriod_(assetIds, borrowedAt, expectedReturnAt);
  } else {
    if (!recordId) {
      throw new Error("歸還申請缺少 recordId");
    }
    markBorrowRecordReturnPending_(recordId);
  }

  const applicationId = generateApplicationId_(type);
  const status = "待審核";
  const createdAt = new Date().toISOString();

  const sheet = getBorrowApplicationsSheet_();
  sheet.appendRow([
    applicationId,
    type,
    studentId,
    studentName,
    studentPhone,
    studentEmail,
    itemName,
    JSON.stringify(assetIds),
    borrowedAt,
    expectedReturnAt,
    status,
    createdAt,
    "",
    "",
    recordId,
    borrowerGroup,
    mentorName,
    activityName,
  ]);
  bumpDataVersion_();

  return { ok: true, applicationId: applicationId };
}

function listAvailableAssets_(borrowedAt, expectedReturnAt) {
  ensureDateOnOrAfterToday_(borrowedAt, "borrowedAt");
  ensureDateRange_(borrowedAt, expectedReturnAt);

  const assets = readAssets_();
  const occupied = getOccupiedAssetIdSetForPeriod_(borrowedAt, expectedReturnAt);
  const venues = [];
  const equipments = [];

  for (var i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (asset.status === "停用中") continue;
    if (occupied[asset.id]) continue;
    if (asset.type === "venue") venues.push(asset);
    if (asset.type === "equipment") equipments.push(asset);
  }

  return { venues: venues, equipments: equipments };
}

function listAvailableAssetsByStartDate_(borrowedAt) {
  ensureDateOnOrAfterToday_(borrowedAt, "borrowedAt");

  const assets = readAssets_();
  const blockedRangeMap = getBlockedRangesByAssetId_();
  const venues = [];
  const equipments = [];

  for (var i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (asset.status === "停用中") continue;

    const blockedRanges = getAssetBlockedRanges_(asset.id, blockedRangeMap);
    let hasAvailableReturnDate = false;
    for (var offset = 0; offset <= 6; offset++) {
      const expectedReturnAt = addDaysText_(borrowedAt, offset);
      if (!isBlockedByRanges_(borrowedAt, expectedReturnAt, blockedRanges)) {
        hasAvailableReturnDate = true;
        break;
      }
    }

    if (!hasAvailableReturnDate) continue;
    if (asset.type === "venue") venues.push(asset);
    if (asset.type === "equipment") equipments.push(asset);
  }

  return { venues: venues, equipments: equipments };
}

function ensureAssetsAvailableForPeriod_(assetIds, borrowedAt, expectedReturnAt) {
  const assets = readAssets_();
  const assetMap = {};
  for (var i = 0; i < assets.length; i++) {
    assetMap[assets[i].id] = assets[i];
  }

  const occupied = getOccupiedAssetIdSetForPeriod_(borrowedAt, expectedReturnAt);

  for (var a = 0; a < assetIds.length; a++) {
    const assetId = String(assetIds[a] || "").trim();
    const asset = assetMap[assetId];
    if (!asset) throw new Error("找不到資產：" + assetId);
    if (asset.status === "停用中") {
      throw new Error("資產停用中，暫不可借：" + asset.name);
    }
    if (occupied[assetId]) {
      throw new Error("資產時段衝突，請改選其他項目：" + asset.name);
    }
  }
}

function getOccupiedAssetIdSetForPeriod_(targetBorrowedAt, targetExpectedReturnAt) {
  const occupied = {};
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return occupied;
  const todayText = getTodayText_();

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][10] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;

    const borrowedAt = normalizeDateText_(rows[i][7]);
    const expectedReturnAt = normalizeDateText_(rows[i][8]);
    if (!borrowedAt || !expectedReturnAt) continue;
    const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

    if (isDateRangeOverlapping_(borrowedAt, effectiveEndAt, targetBorrowedAt, targetExpectedReturnAt)) {
      const ids = parseStringArray_(rows[i][6]);
      for (var a = 0; a < ids.length; a++) {
        occupied[ids[a]] = true;
      }
    }
  }
  return occupied;
}

function isDateRangeOverlapping_(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

function listAssetAvailableDates_(assetId, fromDate, windowDays) {
  ensureDateOnOrAfterToday_(fromDate, "fromDate");
  if (windowDays < 1 || windowDays > 90) {
    throw new Error("windowDays 需介於 1 到 90");
  }

  const assets = readAssets_();
  const targetAsset = assets.find(function (asset) {
    return asset.id === assetId;
  });
  if (!targetAsset) throw new Error("找不到資產：" + assetId);
  if (targetAsset.status === "停用中") {
    return { assetId: assetId, fromDate: fromDate, dates: [] };
  }

  const blockedRangeMap = getBlockedRangesByAssetId_();
  const blockedRanges = getAssetBlockedRanges_(assetId, blockedRangeMap);
  const dates = [];
  for (var day = 0; day < windowDays; day++) {
    const startDate = addDaysText_(fromDate, day);
    var hasAvailableReturnDate = false;
    for (var offset = 0; offset <= 6; offset++) {
      const expectedReturnAt = addDaysText_(startDate, offset);
      if (!isBlockedByRanges_(startDate, expectedReturnAt, blockedRanges)) {
        hasAvailableReturnDate = true;
        break;
      }
    }

    if (hasAvailableReturnDate) {
      dates.push(startDate);
    }
  }

  return {
    assetId: assetId,
    fromDate: fromDate,
    dates: dates,
  };
}

function listAvailableReturnDates_(assetId, borrowedAt) {
  ensureDateOnOrAfterToday_(borrowedAt, "borrowedAt");

  const assets = readAssets_();
  const targetAsset = assets.find(function (asset) {
    return asset.id === assetId;
  });
  if (!targetAsset) throw new Error("找不到資產：" + assetId);
  if (targetAsset.status === "停用中") {
    return { assetId: assetId, borrowedAt: borrowedAt, dates: [] };
  }

  const blockedRanges = getAssetBlockedRanges_(assetId);
  const dates = [];
  for (var offset = 0; offset <= 6; offset++) {
    const expectedReturnAt = addDaysText_(borrowedAt, offset);
    if (!isBlockedByRanges_(borrowedAt, expectedReturnAt, blockedRanges)) {
      dates.push(expectedReturnAt);
    }
  }
  return { assetId: assetId, borrowedAt: borrowedAt, dates: dates };
}

function listAssetBlockedRanges_() {
  const todayText = getTodayText_();
  const blockedRangeMap = getBlockedRangesByAssetId_();
  const normalized = {};
  const assetIds = Object.keys(blockedRangeMap);

  for (var i = 0; i < assetIds.length; i++) {
    const assetId = assetIds[i];
    const ranges = blockedRangeMap[assetId] || [];
    const filtered = [];

    for (var r = 0; r < ranges.length; r++) {
      const range = ranges[r];
      if (String(range.end || "").trim() >= todayText) {
        filtered.push({ start: range.start, end: range.end });
      }
    }

    if (filtered.length > 0) {
      normalized[assetId] = filtered;
    }
  }

  return {
    today: todayText,
    blockedRangesByAssetId: normalized,
  };
}

function getAssetBlockedRanges_(assetId, blockedRangeMap) {
  if (blockedRangeMap) {
    return blockedRangeMap[assetId] || [];
  }

  const ranges = [];
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return ranges;
  const todayText = getTodayText_();

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][10] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = normalizeDateText_(rows[i][7]);
    const expectedReturnAt = normalizeDateText_(rows[i][8]);
    if (!borrowedAt || !expectedReturnAt) continue;
    const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

    const assetIds = parseStringArray_(rows[i][6]);
    if (assetIds.indexOf(assetId) >= 0) {
      ranges.push({ start: borrowedAt, end: effectiveEndAt });
    }
  }
  const pauseRangesByAssetId = getPauseRangesByAssetId_();
  const pauseRanges = pauseRangesByAssetId[assetId] || [];
  for (var p = 0; p < pauseRanges.length; p++) {
    ranges.push({ start: pauseRanges[p].start, end: pauseRanges[p].end });
  }
  return ranges;
}

function getBlockedRangesByAssetId_() {
  const blockedRangeMap = {};
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return blockedRangeMap;
  const todayText = getTodayText_();

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][10] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = normalizeDateText_(rows[i][7]);
    const expectedReturnAt = normalizeDateText_(rows[i][8]);
    if (!borrowedAt || !expectedReturnAt) continue;
    const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

    const assetIds = parseStringArray_(rows[i][6]);
    for (var a = 0; a < assetIds.length; a++) {
      const currentAssetId = assetIds[a];
      if (!blockedRangeMap[currentAssetId]) {
        blockedRangeMap[currentAssetId] = [];
      }
      blockedRangeMap[currentAssetId].push({ start: borrowedAt, end: effectiveEndAt });
    }
  }

  const pauseRangesByAssetId = getPauseRangesByAssetId_();
  const pauseAssetIds = Object.keys(pauseRangesByAssetId);
  for (var p = 0; p < pauseAssetIds.length; p++) {
    const pauseAssetId = pauseAssetIds[p];
    if (!blockedRangeMap[pauseAssetId]) {
      blockedRangeMap[pauseAssetId] = [];
    }
    const ranges = pauseRangesByAssetId[pauseAssetId] || [];
    for (var r = 0; r < ranges.length; r++) {
      blockedRangeMap[pauseAssetId].push({ start: ranges[r].start, end: ranges[r].end });
    }
  }

  return blockedRangeMap;
}

function getPauseRangesByAssetId_() {
  const map = {};
  const ranges = readAssetPauseRanges_();
  for (var i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (!map[range.assetId]) {
      map[range.assetId] = [];
    }
    map[range.assetId].push({ start: range.startDate, end: range.endDate });
  }
  return map;
}

function getEffectiveBlockedRangeEndDate_(recordStatus, expectedReturnAt, todayText) {
  if (recordStatus === "租借中" && expectedReturnAt < todayText) {
    return FAR_FUTURE_BLOCKED_END_DATE;
  }
  return expectedReturnAt;
}

function isBlockedByRanges_(startDate, endDate, ranges) {
  for (var i = 0; i < ranges.length; i++) {
    if (isDateRangeOverlapping_(ranges[i].start, ranges[i].end, startDate, endDate)) {
      return true;
    }
  }
  return false;
}

function reviewBorrowApplication_(body) {
  const applicationId = requireField_(body && body.applicationId, "applicationId");
  const action = String((body && body.action) || "").trim();
  const staffName = requireField_(body && body.staffName, "staffName");
  if (action !== "approve" && action !== "reject") {
    throw new Error("action 必須為 approve 或 reject");
  }

  const appSheet = getBorrowApplicationsSheet_();
  const appRowIndex = findRowById_(appSheet, BORROW_APPLICATION_HEADERS.length, applicationId);
  if (appRowIndex < 0) {
    throw new Error("找不到指定申請");
  }

  const row = appSheet.getRange(appRowIndex, 1, 1, BORROW_APPLICATION_HEADERS.length).getValues()[0];
  const appType = String(row[1] || "").trim();
  const currentStatus = String(row[10] || "").trim();
  if (currentStatus !== "待審核") {
    throw new Error("此申請已審核，無法重複操作");
  }

  const reviewedAt = getTodayText_();
  const nextStatus = action === "approve" ? "已核准" : "已駁回";

  row[10] = nextStatus;
  row[12] = staffName;
  row[13] = reviewedAt;
  row[8] = normalizeDateText_(row[8]);
  row[9] = normalizeDateText_(row[9]);

  let linkedRecordId = String(row[14] || "").trim();
  if (appType === "借用申請") {
    if (action === "approve") {
      linkedRecordId = createBorrowRecordFromApplicationRow_(row);
      row[14] = linkedRecordId;
    }
  } else if (appType === "歸還申請") {
    if (!linkedRecordId) {
      throw new Error("歸還申請缺少 recordId");
    }
    if (action === "approve") {
      markBorrowRecordReturned_(linkedRecordId, reviewedAt);
    } else {
      clearBorrowRecordReturnPending_(linkedRecordId);
    }
  }

  appSheet.getRange(appRowIndex, 1, 1, BORROW_APPLICATION_HEADERS.length).setValues([row]);
  reconcileBorrowingState_();
  bumpDataVersion_();
  return {
    ok: true,
    applicationId: applicationId,
    status: nextStatus,
    recordId: linkedRecordId || "",
  };
}

function createBorrowRecordFromApplicationRow_(appRow) {
  const recordSheet = getBorrowRecordsSheet_();
  const recordId = "rec-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const borrowedAt = normalizeDateText_(appRow[8]);
  const expectedReturnAt = normalizeDateText_(appRow[9]);
  recordSheet.appendRow([
    recordId,
    String(appRow[2] || "").trim(),
    String(appRow[3] || "").trim(),
    normalizePhoneText_(appRow[4]),
    String(appRow[5] || "").trim(),
    String(appRow[6] || "").trim(),
    String(appRow[7] || "").trim(),
    borrowedAt,
    expectedReturnAt,
    "",
    getRecordStatusByBorrowDate_(borrowedAt),
    "",
    String(appRow[15] || "").trim(),
    String(appRow[16] || "").trim(),
    String(appRow[17] || "").trim(),
  ]);
  return recordId;
}

function markBorrowRecordReturned_(recordId, returnedAt) {
  const recordSheet = getBorrowRecordsSheet_();
  const rowIndex = findRowById_(recordSheet, BORROW_RECORD_HEADERS.length, recordId);
  if (rowIndex < 0) {
    throw new Error("找不到對應租借紀錄");
  }

  const row = recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).getValues()[0];
  row[9] = returnedAt;
  row[10] = "已歸還";
  row[11] = "";
  recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
}

function markBorrowRecordReturnPending_(recordId) {
  const recordSheet = getBorrowRecordsSheet_();
  const rowIndex = findRowById_(recordSheet, BORROW_RECORD_HEADERS.length, recordId);
  if (rowIndex < 0) {
    throw new Error("找不到對應租借紀錄");
  }

  const row = recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).getValues()[0];
  const status = String(row[10] || "").trim();
  if (status !== "租借中" && status !== "待生效") {
    throw new Error("此租借紀錄目前不可申請歸還");
  }
  if (String(row[11] || "").trim() === "待審核") {
    throw new Error("此項目已有待審核歸還申請，請等待職員審核。");
  }
  row[11] = "待審核";
  recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
}

function clearBorrowRecordReturnPending_(recordId) {
  const recordSheet = getBorrowRecordsSheet_();
  const rowIndex = findRowById_(recordSheet, BORROW_RECORD_HEADERS.length, recordId);
  if (rowIndex < 0) {
    throw new Error("找不到對應租借紀錄");
  }

  const row = recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).getValues()[0];
  if (String(row[11] || "").trim() !== "") {
    row[11] = "";
    recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
    return;
  }
  recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
}

function reconcileBorrowingState_() {
  const recordSheet = getBorrowRecordsSheet_();
  const lastRow = recordSheet.getLastRow();
  const activeAssetIdSet = {};
  let hasAnyUpdates = false;
  let hasMeaningfulUpdates = false;

  if (lastRow >= 2) {
    const numRows = lastRow - 1;
    const rows = recordSheet.getRange(2, 1, numRows, BORROW_RECORD_HEADERS.length).getValues();
    let hasRecordUpdates = false;
    let hasMeaningfulRecordUpdates = false;
    const todayText = getTodayText_();

    for (var i = 0; i < rows.length; i++) {
      const row = rows[i];
      const borrowedAt = normalizeDateText_(row[7]);
      const expectedReturnAt = normalizeDateText_(row[8]);
      const returnedAt = normalizeDateText_(row[9]);
      const returnRequestStatus = String(row[11] || "").trim() === "待審核" ? "待審核" : "";
      const currentStatus = String(row[10] || "").trim();
      var nextStatus = currentStatus;

      if (row[7] !== borrowedAt) {
        row[7] = borrowedAt;
        hasRecordUpdates = true;
      }
      if (row[8] !== expectedReturnAt) {
        row[8] = expectedReturnAt;
        hasRecordUpdates = true;
      }
      if (row[9] !== returnedAt) {
        row[9] = returnedAt;
        hasRecordUpdates = true;
      }
      if (row[11] !== returnRequestStatus) {
        row[11] = returnRequestStatus;
        hasRecordUpdates = true;
      }

      if (returnedAt) {
        nextStatus = "已歸還";
        if (row[11] !== "") {
          row[11] = "";
          hasRecordUpdates = true;
          hasMeaningfulRecordUpdates = true;
        }
      } else if (borrowedAt && borrowedAt > todayText) {
        nextStatus = "待生效";
      } else {
        nextStatus = "租借中";
        const assetIds = parseStringArray_(row[6]);
        for (var a = 0; a < assetIds.length; a++) {
          activeAssetIdSet[assetIds[a]] = true;
        }
      }

      if (nextStatus !== currentStatus) {
        row[10] = nextStatus;
        hasRecordUpdates = true;
        hasMeaningfulRecordUpdates = true;
      }
    }

    if (hasRecordUpdates) {
      recordSheet.getRange(2, 1, numRows, BORROW_RECORD_HEADERS.length).setValues(rows);
      hasAnyUpdates = true;
      if (hasMeaningfulRecordUpdates) {
        hasMeaningfulUpdates = true;
      }
    }
  }

  if (syncAssetStatusFromRecords_(activeAssetIdSet)) {
    hasAnyUpdates = true;
    hasMeaningfulUpdates = true;
  }
  return {
    hasAnyUpdates: hasAnyUpdates,
    hasMeaningfulUpdates: hasMeaningfulUpdates,
  };
}

function syncAssetStatusFromRecords_(activeAssetIdSet) {
  const assetSheet = getAssetsSheet_();
  const lastRow = assetSheet.getLastRow();
  if (lastRow < 2) return false;

  const numRows = lastRow - 1;
  const rows = assetSheet.getRange(2, 1, numRows, ASSET_HEADERS.length).getValues();
  let hasAssetUpdates = false;

  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const assetId = String(row[0] || "").trim();
    const currentStatus = String(row[3] || "").trim() || "可租借";
    if (!assetId) continue;

    if (activeAssetIdSet[assetId]) {
      if (currentStatus !== "已借出") {
        row[3] = "已借出";
        hasAssetUpdates = true;
      }
    } else if (currentStatus === "已借出") {
      row[3] = "可租借";
      hasAssetUpdates = true;
    }
  }

  if (hasAssetUpdates) {
    assetSheet.getRange(2, 1, numRows, ASSET_HEADERS.length).setValues(rows);
  }
  return hasAssetUpdates;
}

function getRecordStatusByBorrowDate_(borrowedAt) {
  if (!borrowedAt) return "租借中";
  return borrowedAt > getTodayText_() ? "待生效" : "租借中";
}

function getTodayText_() {
  return Utilities.formatDate(new Date(), APP_TIME_ZONE, "yyyy-MM-dd");
}

function updateAssetStatuses_(assetIds, nextStatus) {
  if (VALID_STATUS.indexOf(nextStatus) === -1) {
    throw new Error("資產狀態錯誤：" + nextStatus);
  }
  if (!assetIds || assetIds.length === 0) return;

  const sheet = getAssetsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const numRows = lastRow - 1;
  const rows = sheet.getRange(2, 1, numRows, ASSET_HEADERS.length).getValues();
  const idSet = {};
  for (var i = 0; i < assetIds.length; i++) {
    idSet[String(assetIds[i] || "").trim()] = true;
  }

  for (var r = 0; r < rows.length; r++) {
    const id = String(rows[r][0] || "").trim();
    if (!id || !idSet[id]) continue;
    rows[r][3] = nextStatus;
  }

  sheet.getRange(2, 1, numRows, ASSET_HEADERS.length).setValues(rows);
}

function findRowById_(sheet, width, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === id) {
      return i + 2;
    }
  }
  return -1;
}

function requireField_(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) throw new Error(fieldName + " 為必填");
  return text;
}

function requireDateText_(value, fieldName) {
  const text = normalizeDateText_(value);
  if (!text) throw new Error(fieldName + " 為必填");
  if (!DATE_TEXT_PATTERN.test(text)) {
    throw new Error(fieldName + " 格式需為 YYYY-MM-DD");
  }
  return text;
}

function normalizeDateText_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_TIME_ZONE, "yyyy-MM-dd");
  }

  const text = String(value).trim();
  if (!text) return "";
  if (DATE_TEXT_PATTERN.test(text)) return text;
  return text;
}

function ensureDateOnOrAfterToday_(dateText, fieldName) {
  const date = requireDateText_(dateText, fieldName);
  const todayText = getTodayText_();
  if (date < todayText) {
    throw new Error(fieldName + " 需為今天或之後");
  }
}

function ensureDateRange_(borrowedAt, expectedReturnAt) {
  const borrowed = requireDateText_(borrowedAt, "borrowedAt");
  const expected = requireDateText_(expectedReturnAt, "expectedReturnAt");
  if (expected < borrowed) {
    throw new Error("expectedReturnAt 不可早於 borrowedAt");
  }
  if (expected > addDaysText_(borrowed, 6)) {
    throw new Error("expectedReturnAt 最多為 borrowedAt 起算第 7 天");
  }
}

function addDaysText_(dateText, days) {
  const date = new Date(dateText + "T00:00:00");
  date.setDate(date.getDate() + days);
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function parsePositiveInt_(raw, fieldName) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(fieldName + " 需為正整數");
  }
  return value;
}

function ensureColumnAsText_(sheet, columnIndex) {
  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, columnIndex, rowCount, 1).setNumberFormat("@");
}

function ensureColumnAsDateText_(sheet, columnIndex) {
  const rowCount = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, columnIndex, rowCount, 1).setNumberFormat("yyyy-mm-dd");
}

function normalizePhoneText_(raw) {
  const text = String(raw || "").trim();
  return text.replace(/^'+/, "");
}

function normalizeIdArray_(value, fieldName) {
  if (!Array.isArray(value)) throw new Error(fieldName + " 必須為陣列");
  const normalized = value
    .map(function (id) {
      return String(id || "").trim();
    })
    .filter(function (id) {
      return Boolean(id);
    });
  if (normalized.length === 0) throw new Error(fieldName + " 至少需要一筆");
  return normalized;
}

function parseStringArray_(raw) {
  if (!raw) return [];
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed)
      ? parsed.map(function (item) {
          return String(item || "").trim();
        }).filter(Boolean)
      : [];
  } catch (_error) {
    return text
      .split(",")
      .map(function (item) {
        return String(item || "").trim();
      })
      .filter(Boolean);
  }
}

function generateApplicationId_(type) {
  const prefix = type === "借用申請" ? "app" : "ret";
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function generateAssetId_(type) {
  const prefix = type === "venue" ? "v" : "e";
  return prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function setupAssetsSheet() {
  getAssetsSheet_();
  getAssetPauseSheet_();
  Logger.log("assets / asset_pause_ranges 分頁已就緒");
}

function setupRentalSheets() {
  getBorrowApplicationsSheet_();
  getBorrowRecordsSheet_();
  Logger.log("borrow_applications / borrow_records 分頁已就緒");
}

function reconcileBorrowingStateJob() {
  const reconcileResult = reconcileBorrowingState_();
  if (reconcileResult.hasMeaningfulUpdates) {
    bumpDataVersion_();
  }
}

function setupDailyReconcileTrigger() {
  const targetHandler = "reconcileBorrowingStateJob";
  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === targetHandler) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger(targetHandler).timeBased().everyDays(1).atHour(0).create();
  Logger.log("每日狀態同步排程已建立");
}

function getDataVersion_() {
  const props = PropertiesService.getScriptProperties();
  let version = String(props.getProperty(DATA_VERSION_KEY) || "").trim();
  if (!version) {
    version = createDataVersion_();
    props.setProperty(DATA_VERSION_KEY, version);
  }
  return version;
}

function bumpDataVersion_() {
  const nextVersion = createDataVersion_();
  PropertiesService.getScriptProperties().setProperty(DATA_VERSION_KEY, nextVersion);
  return nextVersion;
}

function createDataVersion_() {
  return new Date().toISOString() + "-" + Math.floor(Math.random() * 1000);
}
