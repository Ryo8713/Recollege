const SHEET_ASSETS = "assets";
const SHEET_ASSET_PAUSES = "asset_pause_ranges";
const SHEET_BORROW_APPLICATIONS = "borrow_applications";
const SHEET_BORROW_RECORDS = "borrow_records";
const SHEET_STAFF_ACCOUNTS = "staff_accounts";
const SHEET_HOLIDAYS = "holidays";
const SHEET_GLOBAL_PAUSES = "global_pause_ranges";
const SHEET_STUDENT_BLOCKS = "student_borrow_blocks";
const ASSET_HEADERS = ["id", "name", "type", "status", "createdAt"];
const ASSET_PAUSE_HEADERS = ["id", "assetId", "startDate", "endDate", "note", "createdAt"];
const HOLIDAY_HEADERS = ["date", "note", "createdAt", "createdBy"];
const GLOBAL_PAUSE_HEADERS = ["id", "startDate", "endDate", "note", "createdAt", "createdBy"];
const STUDENT_BLOCK_HEADERS = ["studentId", "blockedAt", "note"];
const BORROW_APPLICATION_HEADERS = [
  "id",
  "type",
  "studentId",
  "studentName",
  "studentPhone",
  "studentEmail",
  "itemName",
  "itemType",
  "assetId",
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
  "rejectionReason",
];
// 欄位索引（0-based）；itemType 緊接 itemName 之後
const APP_COL_ITEM_NAME = 6;
const APP_COL_ITEM_TYPE = 7;
const APP_COL_ASSET_ID = 8;
const APP_COL_BORROWED_AT = 9;
const APP_COL_EXPECTED_RETURN_AT = 10;
const APP_COL_STATUS = 11;
const APP_COL_CREATED_AT = 12;
const APP_COL_REVIEWED_BY = 13;
const APP_COL_REVIEWED_AT = 14;
const APP_COL_RECORD_ID = 15;
const APP_COL_BORROWER_GROUP = 16;
const APP_COL_MENTOR_NAME = 17;
const APP_COL_ACTIVITY_NAME = 18;
const APP_COL_REJECTION_REASON = 19;
const BORROW_RECORD_HEADERS = [
  "id",
  "studentId",
  "studentName",
  "studentPhone",
  "studentEmail",
  "itemName",
  "itemType",
  "assetId",
  "borrowedAt",
  "expectedReturnAt",
  "returnedAt",
  "status",
  "returnRequestStatus",
  "borrowerGroup",
  "mentorName",
  "activityName",
];
// 欄位索引（0-based）；itemType 緊接 itemName 之後
const RECORD_COL_ITEM_NAME = 5;
const RECORD_COL_ITEM_TYPE = 6;
const RECORD_COL_ASSET_ID = 7;
const RECORD_COL_BORROWED_AT = 8;
const RECORD_COL_EXPECTED_RETURN_AT = 9;
const RECORD_COL_RETURNED_AT = 10;
const RECORD_COL_STATUS = 11;
const RECORD_COL_RETURN_REQUEST_STATUS = 12;
const RECORD_COL_BORROWER_GROUP = 13;
const RECORD_COL_MENTOR_NAME = 14;
const RECORD_COL_ACTIVITY_NAME = 15;
const VALID_TYPES = ["venue", "equipment"];
const ITEM_TYPE_LABELS = { venue: "空間", equipment: "設備" };
// 舊資料 itemName 為「空間:名稱」／「設備:名稱」格式，拆欄後以此解析前綴
const LEGACY_ITEM_NAME_PREFIX_PATTERN = /^(空間|場地|設備|器材)\s*[:：]\s*/;
const VALID_APPLICATION_TYPES = ["借用申請", "歸還申請"];
const VALID_APPLICATION_STATUS = ["待審核", "已核准", "已駁回"];
const VALID_RECORD_STATUS = ["待生效", "租借中", "已歸還"];
const STAFF_ACCOUNT_HEADERS = ["name", "account", "password", "createdAt", "createdBy"];
const DEFAULT_STAFF_ACCOUNT = "admin";
const DEFAULT_STAFF_PASSWORD = "1234";
const APP_TIME_ZONE = "Asia/Taipei";
const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const DATA_VERSION_KEY = "dataVersion";

// 空間（venue）以小時計的營業時段（24 小時制整點）
// 平日：可借 1700-2300；假日／國定假日：可借 0800-2300
const VENUE_WEEKDAY_OPEN_HOUR = 17;
const VENUE_WEEKEND_OPEN_HOUR = 8;
const VENUE_CLOSE_HOUR = 23;

// 申請需要作業時間：最早可借用日 = 申請當日不計入，從次日起算的第 N 個工作天（跳過週末與國定假日）
const BORROW_LEAD_WORKING_DAYS = 3;

// Request-local memo：同一個 doGet/doPost 執行期間只讀資產表一次
var assetsCache_ = null;
var assetTypeMapCache_ = null;

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

    if (path === "holidays" && method === "GET") {
      return jsonResponse_(readHolidays_());
    }

    if (path === "global-pauses" && method === "GET") {
      return jsonResponse_(readGlobalPauseRanges_());
    }

    if (path === "student-blocks" && method === "GET") {
      return jsonResponse_(readStudentBlocks_());
    }

    if (path === "venue-occupied-slots" && method === "GET") {
      const assetId = requireField_(e && e.parameter && e.parameter.assetId, "assetId");
      const date = requireDateText_(e && e.parameter && e.parameter.date, "date");
      return jsonResponse_(listVenueOccupiedSlots_(assetId, date));
    }

    if (path === "staff-login" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(verifyStaffLogin_(body));
    }

    if (path === "availability" && method === "GET") {
      const borrowedAt = requireDateText_(e && e.parameter && e.parameter.borrowedAt, "borrowedAt");
      return jsonResponse_(listAvailableAssetsByStartDate_(borrowedAt));
    }

    if (path === "asset-availability-dates" && method === "GET") {
      const assetId = requireField_(e && e.parameter && e.parameter.assetId, "assetId");
      const fromDateParam = e && e.parameter && e.parameter.fromDate;
      const fromDate = fromDateParam
        ? requireDateText_(fromDateParam, "fromDate")
        : getTodayText_();
      const windowDays = parsePositiveInt_(
        e && e.parameter && e.parameter.windowDays,
        "windowDays"
      );
      return jsonResponse_(listAssetAvailableDates_(assetId, fromDate, windowDays));
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

    if (path === "asset-deletes" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(deleteAsset_(body));
    }

    if (path === "holidays" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createHoliday_(body));
    }

    if (path === "holiday-deletes" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(deleteHoliday_(body));
    }

    if (path === "global-pauses" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createGlobalPauseRange_(body));
    }

    if (path === "global-pause-deletes" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(deleteGlobalPauseRange_(body));
    }

    if (path === "student-blocks" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(createStudentBlock_(body));
    }

    if (path === "student-block-deletes" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(deleteStudentBlock_(body));
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

    if (path === "borrow-record-expected-return-updates" && method === "POST") {
      const body = parseBody_(e);
      return jsonResponse_(updateBorrowRecordExpectedReturnAt_(body));
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
  const sheet = getBorrowSheet_(SHEET_BORROW_APPLICATIONS, BORROW_APPLICATION_HEADERS);
  ensureColumnAsText_(sheet, 5); // studentPhone
  // 空間以小時計，borrowedAt/expectedReturnAt 可能為「YYYY-MM-DD HH:mm」，需存為純文字
  ensureColumnAsText_(sheet, APP_COL_BORROWED_AT + 1);
  ensureColumnAsText_(sheet, APP_COL_EXPECTED_RETURN_AT + 1);
  return sheet;
}

function getBorrowRecordsSheet_() {
  const sheet = getBorrowSheet_(SHEET_BORROW_RECORDS, BORROW_RECORD_HEADERS);
  ensureColumnAsText_(sheet, 4); // studentPhone
  ensureColumnAsText_(sheet, RECORD_COL_BORROWED_AT + 1);
  ensureColumnAsText_(sheet, RECORD_COL_EXPECTED_RETURN_AT + 1);
  return sheet;
}

// 借用兩表的欄位順序由 ensureBorrowSheetColumnLayout_ 依表頭名稱維護，
// 不能走 ensureHeaders_（表頭改名時它會插入空白列，把舊表頭擠成資料列）。
function getBorrowSheet_(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  ensureBorrowSheetColumnLayout_(sheet, headers);
  return sheet;
}

function getHolidaysSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_HOLIDAYS, HOLIDAY_HEADERS);
  ensureColumnAsDateText_(sheet, 1); // date
  return sheet;
}

function getGlobalPauseSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_GLOBAL_PAUSES, GLOBAL_PAUSE_HEADERS);
  ensureColumnAsDateText_(sheet, 2); // startDate
  ensureColumnAsDateText_(sheet, 3); // endDate
  return sheet;
}

function getStaffAccountsSheet_() {
  const existingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_STAFF_ACCOUNTS);
  if (existingSheet) {
    migrateStaffAccountsSheet_(existingSheet);
  }
  const sheet = getSheetWithHeaders_(SHEET_STAFF_ACCOUNTS, STAFF_ACCOUNT_HEADERS);
  ensureDefaultStaffAccount_(sheet);
  return sheet;
}

function migrateStaffAccountsSheet_(sheet) {
  if (sheet.getLastRow() < 1) return;
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (header) {
    return String(header || "").trim();
  });
  const alreadyCurrent = STAFF_ACCOUNT_HEADERS.every(function (header, index) {
    return headers[index] === header;
  }) && headers.length === STAFF_ACCOUNT_HEADERS.length;
  if (alreadyCurrent) return;

  const headerIndexes = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) headerIndexes[headers[i].toLowerCase()] = i;
  }

  const lastRow = sheet.getLastRow();
  var migratedRows = [];
  if (lastRow >= 2) {
    const oldRows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    migratedRows = oldRows.map(function (row) {
      const accountIndex = headerIndexes.account;
      const account = accountIndex === undefined ? "" : String(row[accountIndex] || "").trim();
      return STAFF_ACCOUNT_HEADERS.map(function (header) {
        const sourceIndex = headerIndexes[header.toLowerCase()];
        if (sourceIndex !== undefined) return row[sourceIndex];
        if (header === "name") return account;
        return "";
      });
    });
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, STAFF_ACCOUNT_HEADERS.length).setValues([STAFF_ACCOUNT_HEADERS]);
  if (migratedRows.length > 0) {
    sheet.getRange(2, 1, migratedRows.length, STAFF_ACCOUNT_HEADERS.length).setValues(migratedRows);
  }
  sheet.setFrozenRows(1);
}

function getStudentBlocksSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_STUDENT_BLOCKS, STUDENT_BLOCK_HEADERS);
  ensureColumnAsDateText_(sheet, 2); // blockedAt
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

  const existingPrefixMatches = headers.every(function (h, i) {
    const current = String(firstRow[i] || "").trim();
    return current === h || (i >= sheet.getLastColumn() && current === "");
  });
  if (needsHeader && existingPrefixMatches && sheet.getLastColumn() < headers.length) {
    sheet.getRange(1, sheet.getLastColumn() + 1, 1, headers.length - sheet.getLastColumn()).setValues([
      headers.slice(sheet.getLastColumn()),
    ]);
    sheet.setFrozenRows(1);
    return;
  }

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

function invalidateAssetsCache_() {
  assetsCache_ = null;
  assetTypeMapCache_ = null;
}

function readAssets_() {
  if (assetsCache_) {
    return assetsCache_;
  }

  const sheet = getAssetsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    assetsCache_ = [];
    return assetsCache_;
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

  assetsCache_ = assets;
  return assetsCache_;
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
  const createdAt = getNowDateTimeText_();
  const status = "可租借";

  sheet.appendRow([assetId, name, type, status, createdAt]);
  invalidateAssetsCache_();
  const version = bumpDataVersion_();

  return { assetId: assetId, version: version };
}

function deleteAsset_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }

  const assetId = requireField_(body && body.assetId, "assetId");
  ensureAssetCanBeDeleted_(assetId);

  const sheet = getAssetsSheet_();
  const rowIndex = findRowById_(sheet, ASSET_HEADERS.length, assetId);
  if (rowIndex < 0) {
    throw new Error("找不到資產：" + assetId);
  }
  const row = sheet.getRange(rowIndex, 1, 1, ASSET_HEADERS.length).getValues()[0];
  const assetName = String(row[1] || "").trim();
  sheet.deleteRow(rowIndex);
  deleteAssetPauseRanges_(assetId);
  invalidateAssetsCache_();
  const version = bumpDataVersion_();
  return { ok: true, assetId: assetId, name: assetName, version: version };
}

function ensureAssetCanBeDeleted_(assetId) {
  const applications = readBorrowApplications_();
  for (var i = 0; i < applications.length; i++) {
    const app = applications[i];
    if (app.status !== "待審核") continue;
    if (app.assetId === assetId) {
      throw new Error("此資產仍有待審核申請，請先完成審核後再刪除。");
    }
  }

  const records = readBorrowRecords_();
  for (var r = 0; r < records.length; r++) {
    const record = records[r];
    if (record.status !== "租借中" && record.status !== "待生效") continue;
    if (record.assetId === assetId) {
      throw new Error("此資產仍有待生效或租借中紀錄，請完成歸還後再刪除。");
    }
  }
}

function deleteAssetPauseRanges_(assetId) {
  const sheet = getAssetPauseSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, ASSET_PAUSE_HEADERS.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1] || "").trim() === assetId) {
      sheet.deleteRow(i + 2);
    }
  }
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
  getAssetOrThrow_(assetId);
  ensurePauseRangeNoBorrowConflict_(assetId, startDate, endDate);

  const sheet = getAssetPauseSheet_();
  const id = "pause-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const createdAt = getNowDateTimeText_();
  sheet.appendRow([id, assetId, startDate, endDate, note, createdAt]);
  const version = bumpDataVersion_();
  return {
    id: id,
    assetId: assetId,
    startDate: startDate,
    endDate: endDate,
    note: note,
    createdAt: createdAt,
    version: version,
  };
}

function readHolidays_() {
  const sheet = getHolidaysSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, HOLIDAY_HEADERS.length).getValues();
  const holidays = [];
  for (var i = 0; i < rows.length; i++) {
    const date = normalizeDateText_(rows[i][0]);
    if (!date || !DATE_TEXT_PATTERN.test(date)) continue;
    holidays.push({
      date: date,
      note: String(rows[i][1] || "").trim(),
      createdAt: String(rows[i][2] || "").trim(),
      createdBy: String(rows[i][3] || "").trim(),
    });
  }
  holidays.sort(function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
  return holidays;
}

function getHolidaySet_() {
  const set = {};
  const holidays = readHolidays_();
  for (var i = 0; i < holidays.length; i++) {
    set[holidays[i].date] = true;
  }
  return set;
}

function createHoliday_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }
  const date = requireDateText_(body && body.date, "date");
  const note = String((body && body.note) || "").trim();
  if (note.length > 60) {
    throw new Error("note 最多 60 字");
  }

  const sheet = getHolidaysSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (normalizeDateText_(existing[i][0]) === date) {
        throw new Error("此日期已是國定假日：" + date);
      }
    }
  }

  const createdAt = getNowDateTimeText_();
  sheet.appendRow([date, note, createdAt, operator.account]);
  const version = bumpDataVersion_();
  return { ok: true, date: date, note: note, createdAt: createdAt, createdBy: operator.account, version: version };
}

function deleteHoliday_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }
  const date = requireDateText_(body && body.date, "date");

  const sheet = getHolidaysSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw new Error("找不到此國定假日：" + date);
  }
  const rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (normalizeDateText_(rows[i][0]) === date) {
      sheet.deleteRow(i + 2);
      const version = bumpDataVersion_();
      return { ok: true, date: date, version: version };
    }
  }
  throw new Error("找不到此國定假日：" + date);
}

function readGlobalPauseRanges_() {
  const sheet = getGlobalPauseSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, GLOBAL_PAUSE_HEADERS.length).getValues();
  const ranges = [];
  for (var i = 0; i < rows.length; i++) {
    const id = String(rows[i][0] || "").trim();
    const startDate = normalizeDateText_(rows[i][1]);
    const endDate = normalizeDateText_(rows[i][2]);
    if (!id || !startDate || !endDate) continue;
    ranges.push({
      id: id,
      startDate: startDate,
      endDate: endDate,
      note: String(rows[i][3] || "").trim(),
      createdAt: String(rows[i][4] || "").trim(),
      createdBy: String(rows[i][5] || "").trim(),
    });
  }
  ranges.sort(function (a, b) {
    const startDiff = a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0;
    if (startDiff !== 0) return startDiff;
    return a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0;
  });
  return ranges;
}

function getGlobalPauseRanges_() {
  const ranges = readGlobalPauseRanges_();
  return ranges.map(function (range) {
    return { start: range.startDate, end: range.endDate };
  });
}

function isGloballyClosedDate_(dateText, globalPauseRanges) {
  const ranges = globalPauseRanges || getGlobalPauseRanges_();
  return isDateWithinAnyRange_(dateText, ranges);
}

function ensurePeriodNotGloballyClosed_(startDate, endDate) {
  const ranges = getGlobalPauseRanges_();
  if (isBlockedByRanges_(startDate, endDate, ranges)) {
    throw new Error("此借用期間落在全校暫停借用區間內，暫不可借。");
  }
}

function ensureGlobalPauseRangeNoBorrowConflict_(pauseStartDate, pauseEndDate) {
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_BORROWED_AT]));
    const expectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]));
    if (!borrowedAt || !expectedReturnAt) continue;
    if (isDateRangeOverlapping_(borrowedAt, expectedReturnAt, pauseStartDate, pauseEndDate)) {
      throw new Error("此暫停區間與既有借用紀錄衝突，請先處理相關借用。");
    }
  }
}

function createGlobalPauseRange_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }
  const startDate = requireDateText_(body && body.startDate, "startDate");
  const endDate = requireDateText_(body && body.endDate, "endDate");
  const note = String((body && body.note) || "").trim();
  if (endDate < startDate) {
    throw new Error("endDate 不可早於 startDate");
  }
  if (note.length > 60) {
    throw new Error("note 最多 60 字");
  }
  ensureGlobalPauseRangeNoBorrowConflict_(startDate, endDate);

  const sheet = getGlobalPauseSheet_();
  const id = "global-pause-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const createdAt = getNowDateTimeText_();
  sheet.appendRow([id, startDate, endDate, note, createdAt, operator.account]);
  const version = bumpDataVersion_();
  return {
    id: id,
    startDate: startDate,
    endDate: endDate,
    note: note,
    createdAt: createdAt,
    createdBy: operator.account,
    version: version,
  };
}

function deleteGlobalPauseRange_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }
  const id = requireField_(body && body.id, "id");

  const sheet = getGlobalPauseSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw new Error("找不到此全校暫停區間：" + id);
  }
  const rows = sheet.getRange(2, 1, lastRow - 1, GLOBAL_PAUSE_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === id) {
      sheet.deleteRow(i + 2);
      const version = bumpDataVersion_();
      return { ok: true, id: id, version: version };
    }
  }
  throw new Error("找不到此全校暫停區間：" + id);
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
    const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = normalizeDateText_(rows[i][RECORD_COL_BORROWED_AT]);
    const expectedReturnAt = normalizeDateText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]);
    if (!borrowedAt || !expectedReturnAt) continue;
    if (String(rows[i][RECORD_COL_ASSET_ID] || "").trim() !== assetId) continue;
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
    const name = String(rows[i][0] || "").trim();
    const account = String(rows[i][1] || "").trim();
    if (!account) continue;
    accounts.push({
      account: account,
      createdAt: String(rows[i][3] || "").trim(),
      createdBy: String(rows[i][4] || "").trim(),
      name: name || account,
    });
  }
  return accounts;
}

function verifyStaffLogin_(body) {
  const account = requireField_(body && body.account, "account");
  const password = requireField_(body && body.password, "password");
  const staff = findStaffAccount_(account);
  if (!staff || staff.password !== password) {
    throw new Error("帳號或密碼錯誤，請重新輸入。");
  }
  return {
    ok: true,
    account: staff.account,
    name: staff.name || staff.account,
  };
}

function createStaffAccount_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const account = requireField_(body && body.account, "account");
  const password = requireField_(body && body.password, "password");
  const name = requireField_(body && body.name, "name");

  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }
  if (password.length < 4) {
    throw new Error("新密碼至少需 4 碼。");
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(account)) {
    throw new Error("帳號僅允許英數與 . _ - 字元。");
  }

  const existed = findStaffAccount_(account);
  if (existed) {
    throw new Error("帳號已存在，請使用其他帳號。");
  }

  const sheet = getStaffAccountsSheet_();
  const createdAt = getNowDateTimeText_();
  sheet.appendRow([name, account, password, createdAt, operator.account]);
  return { ok: true, account: account, name: name };
}

function findStaffAccount_(account) {
  const target = String(account || "").trim();
  if (!target) return null;
  const sheet = getStaffAccountsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const rows = sheet.getRange(2, 1, lastRow - 1, STAFF_ACCOUNT_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const currentAccount = String(rows[i][1] || "").trim();
    if (currentAccount !== target) continue;
    return {
      account: currentAccount,
      password: String(rows[i][2] || "").trim(),
      createdAt: String(rows[i][3] || "").trim(),
      createdBy: String(rows[i][4] || "").trim(),
      name: String(rows[i][0] || currentAccount).trim(),
    };
  }
  return null;
}

function ensureDefaultStaffAccount_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    sheet.appendRow([
      DEFAULT_STAFF_ACCOUNT,
      DEFAULT_STAFF_ACCOUNT,
      DEFAULT_STAFF_PASSWORD,
      getNowDateTimeText_(),
      "system",
    ]);
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, STAFF_ACCOUNT_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][1] || "").trim() === DEFAULT_STAFF_ACCOUNT) {
      return;
    }
  }
  sheet.appendRow([
    DEFAULT_STAFF_ACCOUNT,
    DEFAULT_STAFF_ACCOUNT,
    DEFAULT_STAFF_PASSWORD,
    getNowDateTimeText_(),
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

    const status = String(row[APP_COL_STATUS] || "").trim();
    const recordId = String(row[APP_COL_RECORD_ID] || "").trim();
    const reviewedBy = String(row[APP_COL_REVIEWED_BY] || "").trim();
    const reviewedAt = normalizeDateText_(row[APP_COL_REVIEWED_AT]);
    const assetId = String(row[APP_COL_ASSET_ID] || "").trim();
    const item = resolveItemTypeAndName_(row[APP_COL_ITEM_TYPE], row[APP_COL_ITEM_NAME], assetId);

    const app = {
      id: id,
      type: type,
      studentId: String(row[2] || "").trim(),
      studentName: String(row[3] || "").trim(),
      studentPhone: normalizePhoneText_(row[4]),
      studentEmail: String(row[5] || "").trim(),
      itemType: item.itemType,
      itemName: item.itemName,
      assetId: assetId,
      borrowedAt: normalizeTemporalText_(row[APP_COL_BORROWED_AT]),
      expectedReturnAt: normalizeTemporalText_(row[APP_COL_EXPECTED_RETURN_AT]),
      status: VALID_APPLICATION_STATUS.indexOf(status) >= 0 ? status : "待審核",
      createdAt: String(row[APP_COL_CREATED_AT] || "").trim(),
      borrowerGroup: String(row[APP_COL_BORROWER_GROUP] || "").trim(),
      mentorName: String(row[APP_COL_MENTOR_NAME] || "").trim(),
      activityName: String(row[APP_COL_ACTIVITY_NAME] || "").trim(),
      rejectionReason: String(row[APP_COL_REJECTION_REASON] || "").trim(),
    };

    if (reviewedBy) app.reviewedBy = reviewedBy;
    if (reviewedAt) app.reviewedAt = reviewedAt;
    if (recordId) app.recordId = recordId;
    applications.push(app);
  }

  return applications;
}

function readBorrowRecords_() {
  // Refresh date-based statuses for this response only.
  // Do not bump dataVersion here — that would notify all clients from a read.
  // Broadcast updates via reconcileBorrowingStateJob instead.
  reconcileBorrowingState_();

  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  const records = [];

  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[0] || "").trim();
    if (!id) continue;

    const status = String(row[RECORD_COL_STATUS] || "").trim();
    if (VALID_RECORD_STATUS.indexOf(status) === -1) continue;

    const returnedAt = normalizeDateText_(row[RECORD_COL_RETURNED_AT]);
    const returnRequestStatus = String(row[RECORD_COL_RETURN_REQUEST_STATUS] || "").trim();
    const assetId = String(row[RECORD_COL_ASSET_ID] || "").trim();
    const item = resolveItemTypeAndName_(row[RECORD_COL_ITEM_TYPE], row[RECORD_COL_ITEM_NAME], assetId);
    const record = {
      id: id,
      studentId: String(row[1] || "").trim(),
      studentName: String(row[2] || "").trim(),
      studentPhone: normalizePhoneText_(row[3]),
      studentEmail: String(row[4] || "").trim(),
      itemType: item.itemType,
      itemName: item.itemName,
      assetId: assetId,
      borrowedAt: normalizeTemporalText_(row[RECORD_COL_BORROWED_AT]),
      expectedReturnAt: normalizeTemporalText_(row[RECORD_COL_EXPECTED_RETURN_AT]),
      status: status,
      returnRequestStatus: returnRequestStatus === "待審核" ? "待審核" : "",
      borrowerGroup: String(row[RECORD_COL_BORROWER_GROUP] || "").trim(),
      mentorName: String(row[RECORD_COL_MENTOR_NAME] || "").trim(),
      activityName: String(row[RECORD_COL_ACTIVITY_NAME] || "").trim(),
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
  const rawItemName = requireField_(body && body.itemName, "itemName");
  const borrowerGroup = String((body && body.borrowerGroup) || "").trim();
  const mentorName = String((body && body.mentorName) || "").trim();
  const activityName = String((body && body.activityName) || "").trim();
  const assetId = requireField_(body && body.assetId, "assetId");
  const recordId = String((body && body.recordId) || "").trim();
  const assetType = getAssetTypeMap_()[assetId];
  // itemType 以資產表為準；找不到資產時才採用前端傳入值（或舊格式前綴）
  const item = resolveItemTypeAndName_(
    normalizeItemType_(assetType) || (body && body.itemType),
    rawItemName,
    assetId
  );
  const itemType = item.itemType;
  const itemName = item.itemName;
  if (!itemName) {
    throw new Error("itemName 為必填");
  }

  let borrowedAt;
  let expectedReturnAt;

  if (type === "借用申請") {
    ensureStudentEligibleForBorrow_(studentId);
    if (!borrowerGroup) {
      throw new Error("borrowerGroup 為必填");
    }
    if (!activityName) {
      throw new Error("activityName 為必填");
    }
    if (assetType === "venue") {
      const booking = validateVenueBooking_(
        assetId,
        body && body.borrowedAt,
        body && body.expectedReturnAt
      );
      borrowedAt = booking.start;
      expectedReturnAt = booking.end;
    } else {
      borrowedAt = requireDateText_(body && body.borrowedAt, "borrowedAt");
      expectedReturnAt = requireDateText_(body && body.expectedReturnAt, "expectedReturnAt");
      ensureDateRange_(borrowedAt, expectedReturnAt);
      ensureDateOnOrAfterToday_(borrowedAt, "borrowedAt");
      ensureAssetAvailableForPeriod_(assetId, borrowedAt, expectedReturnAt);
    }
    ensureBorrowLeadTime_(borrowedAt);
  } else {
    borrowedAt = requireTemporalText_(body && body.borrowedAt, "borrowedAt");
    expectedReturnAt = requireTemporalText_(body && body.expectedReturnAt, "expectedReturnAt");
    if (!recordId) {
      throw new Error("歸還申請缺少 recordId");
    }
    markBorrowRecordReturnPending_(recordId);
  }

  const applicationId = generateApplicationId_(type);
  const status = "待審核";
  const createdAt = getNowDateTimeText_();

  const sheet = getBorrowApplicationsSheet_();
  sheet.appendRow([
    applicationId,
    type,
    studentId,
    studentName,
    formatPhoneForSheet_(studentPhone),
    studentEmail,
    itemName,
    itemType,
    assetId,
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
    "",
  ]);
  const version = bumpDataVersion_();

  return { ok: true, applicationId: applicationId, version: version };
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
  if (isGloballyClosedDate_(borrowedAt)) {
    return { venues: [], equipments: [] };
  }

  const assets = readAssets_();
  const blockedRangeMap = getBlockedRangesByAssetId_();
  const pauseRangesByAssetId = getPauseRangesByAssetId_();
  const holidaySet = getHolidaySet_();
  const venues = [];
  const equipments = [];

  for (var i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (asset.status === "停用中") continue;

    if (asset.type === "venue") {
      const intervals = getVenueBookingContext_(asset.id, borrowedAt);
      const pauseRanges = pauseRangesByAssetId[asset.id] || [];
      if (venueHasFreeHourOnDate_(borrowedAt, intervals, pauseRanges, holidaySet)) {
        venues.push(asset);
      }
      continue;
    }

    if (!isWorkingDayText_(borrowedAt, holidaySet)) continue;
    const blockedRanges = getAssetBlockedRanges_(asset.id, blockedRangeMap);
    if (isDateWithinAnyRange_(borrowedAt, blockedRanges)) continue;
    equipments.push(asset);
  }

  return { venues: venues, equipments: equipments };
}

function getAssetOrThrow_(assetId) {
  const assets = readAssets_();
  for (var i = 0; i < assets.length; i++) {
    if (assets[i].id === assetId) return assets[i];
  }
  throw new Error("找不到資產：" + assetId);
}

function ensureAssetAvailableForPeriod_(assetId, borrowedAt, expectedReturnAt) {
  const asset = getAssetOrThrow_(assetId);
  ensurePeriodNotGloballyClosed_(borrowedAt, expectedReturnAt);

  if (asset.status === "停用中") {
    throw new Error("資產停用中，暫不可借：" + asset.name);
  }
  if (getOccupiedAssetIdSetForPeriod_(borrowedAt, expectedReturnAt)[assetId]) {
    throw new Error("資產時段衝突，請改選其他項目：" + asset.name);
  }
}

function getOccupiedAssetIdSetForPeriod_(targetBorrowedAt, targetExpectedReturnAt, excludeRecordId) {
  const occupied = {};
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return occupied;
  const todayText = getTodayText_();
  const assetTypeMap = getAssetTypeMap_();

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const recordId = String(rows[i][0] || "").trim();
    if (excludeRecordId && recordId === excludeRecordId) continue;

    const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;

    const borrowedAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_BORROWED_AT]));
    const expectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]));
    if (!borrowedAt || !expectedReturnAt) continue;
    const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

    if (isDateRangeOverlapping_(borrowedAt, effectiveEndAt, targetBorrowedAt, targetExpectedReturnAt)) {
      const id = String(rows[i][RECORD_COL_ASSET_ID] || "").trim();
      // 空間以小時計，衝突由 venue 專用流程處理，此處僅處理設備
      if (id && assetTypeMap[id] !== "venue") {
        occupied[id] = true;
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

  const targetAsset = getAssetOrThrow_(assetId);
  if (targetAsset.status === "停用中") {
    return { assetId: assetId, fromDate: fromDate, dates: [] };
  }

  const globalPauseRanges = getGlobalPauseRanges_();
  if (targetAsset.type === "venue") {
    const intervalsByDate = getVenueBookingContext_(assetId);
    const pauseRanges = getPauseRangesByAssetId_()[assetId] || [];
    const venueHolidaySet = getHolidaySet_();
    const venueDates = [];
    for (var vd = 0; vd < windowDays; vd++) {
      const venueDate = addDaysText_(fromDate, vd);
      if (isGloballyClosedDate_(venueDate, globalPauseRanges)) continue;
      if (venueHasFreeHourOnDate_(venueDate, intervalsByDate[venueDate] || [], pauseRanges, venueHolidaySet)) {
        venueDates.push(venueDate);
      }
    }
    return { assetId: assetId, fromDate: fromDate, dates: venueDates };
  }

  const blockedRangeMap = getBlockedRangesByAssetId_();
  const blockedRanges = getAssetBlockedRanges_(assetId, blockedRangeMap);
  const dates = [];
  for (var day = 0; day < windowDays; day++) {
    const startDate = addDaysText_(fromDate, day);
    if (isGloballyClosedDate_(startDate, globalPauseRanges)) continue;
    if (!isWorkingDayText_(startDate, getHolidaySet_())) continue;
    if (isDateWithinAnyRange_(startDate, blockedRanges)) continue;
    dates.push(startDate);
  }

  return {
    assetId: assetId,
    fromDate: fromDate,
    dates: dates,
  };
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
    globalPauseRanges: getGlobalPauseRanges_(),
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
    const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = normalizeDateText_(rows[i][RECORD_COL_BORROWED_AT]);
    const expectedReturnAt = normalizeDateText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]);
    if (!borrowedAt || !expectedReturnAt) continue;
    const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

    if (String(rows[i][RECORD_COL_ASSET_ID] || "").trim() === assetId) {
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
  // 借用紀錄僅供「設備（以天計）」可借計算使用；空間（小時計）的借用衝突由 venue 專用流程處理。
  // 但單一資產停用區間會整日封鎖，空間與設備都需納入，讓前端可借品項列表可直接隱藏停用資產。
  const blockedRangeMap = {};
  const assetTypeMap = getAssetTypeMap_();
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  const todayText = getTodayText_();

  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
      if (status !== "租借中" && status !== "待生效") continue;
      const borrowedAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_BORROWED_AT]));
      const expectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]));
      if (!borrowedAt || !expectedReturnAt) continue;
      const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

      const currentAssetId = String(rows[i][RECORD_COL_ASSET_ID] || "").trim();
      if (!currentAssetId || assetTypeMap[currentAssetId] === "venue") continue;
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
  // 借用皆為預約未來區間，逾期未還不再封鎖未來日期。
  // 占用範圍一律以實際借用區間 [borrowedAt, expectedReturnAt] 計算，
  // 是否可借僅取決於所選日期是否與既有紀錄重疊。
  return expectedReturnAt;
}

function isRecordCurrentlyOverdue_(status, expectedReturnAt, todayText) {
  if (status !== "租借中") return false;
  const dueDate = getDatePart_(normalizeTemporalText_(expectedReturnAt));
  if (!dueDate) return false;
  return dueDate < todayText;
}

function readStudentBlocks_() {
  const sheet = getStudentBlocksSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, STUDENT_BLOCK_HEADERS.length).getValues();
  const list = [];
  for (var i = 0; i < rows.length; i++) {
    const studentId = String(rows[i][0] || "").trim();
    if (!studentId) continue;
    list.push({
      studentId: studentId,
      blockedAt: normalizeDateText_(rows[i][1]),
      note: String(rows[i][2] || "").trim(),
    });
  }
  return list;
}

function isStudentBlocked_(studentId) {
  const normalizedId = String(studentId || "").trim();
  if (!normalizedId) return false;
  const sheet = getStudentBlocksSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === normalizedId) return true;
  }
  return false;
}

// 每日時間觸發器呼叫：掃描目前逾期紀錄，將學號寫入封鎖名單（若尚未登記）。
function dailyCheckAndBlockOverdueStudents_() {
  const todayText = getTodayText_();
  const recordSheet = getBorrowRecordsSheet_();
  const lastRow = recordSheet.getLastRow();
  if (lastRow < 2) return;

  const rows = recordSheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  const blockSheet = getStudentBlocksSheet_();

  // 建立現有封鎖集合以避免重複寫入
  const blockLastRow = blockSheet.getLastRow();
  var existingBlocks = {};
  if (blockLastRow >= 2) {
    const blockRows = blockSheet.getRange(2, 1, blockLastRow - 1, 1).getValues();
    for (var b = 0; b < blockRows.length; b++) {
      const id = String(blockRows[b][0] || "").trim();
      if (id) existingBlocks[id] = true;
    }
  }

  var added = false;
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
    const expectedReturnAt = normalizeTemporalText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]);
    if (!isRecordCurrentlyOverdue_(status, expectedReturnAt, todayText)) continue;
    const studentId = String(rows[i][1] || "").trim();
    if (!studentId || existingBlocks[studentId]) continue;
    blockSheet.appendRow([studentId, todayText, "逾期自動封鎖"]);
    existingBlocks[studentId] = true;
    added = true;
  }

  if (added) bumpDataVersion_();
}

function ensureActiveStaffOperator_(operatorAccount) {
  const operator = findStaffAccount_(operatorAccount);
  if (!operator) {
    throw new Error("職員帳號驗證失敗。");
  }
  return operator;
}

function createStudentBlock_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  ensureActiveStaffOperator_(operatorAccount);
  const studentId = String((body && body.studentId) || "").trim();
  if (!studentId) throw new Error("studentId 為必填");
  const note = String((body && body.note) || "").trim();
  if (note.length > 60) throw new Error("note 最多 60 字");

  const todayText = getTodayText_();
  const sheet = getStudentBlocksSheet_();
  const lastRow = sheet.getLastRow();

  // 已存在則直接回傳
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0] || "").trim() === studentId) {
        return { ok: true, studentId: studentId, alreadyBlocked: true };
      }
    }
  }

  sheet.appendRow([studentId, todayText, note]);
  const version = bumpDataVersion_();
  return { ok: true, studentId: studentId, blockedAt: todayText, note: note, version: version };
}

function deleteStudentBlock_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  ensureActiveStaffOperator_(operatorAccount);
  const studentId = String((body && body.studentId) || "").trim();
  if (!studentId) throw new Error("studentId 為必填");

  const sheet = getStudentBlocksSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("找不到封鎖紀錄");

  const rows = sheet.getRange(2, 1, lastRow - 1, STUDENT_BLOCK_HEADERS.length).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][0] || "").trim() === studentId) {
      sheet.deleteRow(i + 2);
      const version = bumpDataVersion_();
      return { ok: true, studentId: studentId, version: version };
    }
  }
  throw new Error("找不到封鎖紀錄");
}

function ensureStudentEligibleForBorrow_(studentId) {
  if (isStudentBlocked_(studentId)) {
    throw new Error(
      "您目前有逾期或未準時歸還的借用紀錄，暫無法提出借用申請。請先完成歸還並洽詢服務台。"
    );
  }
}

function isBlockedByRanges_(startDate, endDate, ranges) {
  for (var i = 0; i < ranges.length; i++) {
    if (isDateRangeOverlapping_(ranges[i].start, ranges[i].end, startDate, endDate)) {
      return true;
    }
  }
  return false;
}

function getVenueBookingContext_(assetId, dateText, excludeRecordId) {
  const intervalsByDate = {};
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      const recordId = String(rows[i][0] || "").trim();
      if (excludeRecordId && recordId === excludeRecordId) continue;

      const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
      if (status !== "租借中" && status !== "待生效") continue;
      if (String(rows[i][RECORD_COL_ITEM_TYPE] || "").trim() !== "venue") continue;
      if (String(rows[i][RECORD_COL_ASSET_ID] || "").trim() !== assetId) continue;

      const start = rows[i][RECORD_COL_BORROWED_AT];
      const end = rows[i][RECORD_COL_EXPECTED_RETURN_AT];
      const date = getDatePart_(start);
      if (dateText && date !== dateText) continue;
      if (!isVenueTemporal_(start) || !isVenueTemporal_(end)) continue;

      if (!intervalsByDate[date]) intervalsByDate[date] = [];
      intervalsByDate[date].push({
        start: getHourFromDateTime_(start),
        end: getHourFromDateTime_(end),
      });
    }
  }
  if (dateText) return intervalsByDate[dateText] || [];
  return intervalsByDate;
}

function isDateWithinAnyRange_(dateText, ranges) {
  for (var i = 0; i < ranges.length; i++) {
    if (ranges[i].start <= dateText && dateText <= ranges[i].end) return true;
  }
  return false;
}

function computeVenueFreeStartHours_(intervals, openStart, openEnd) {
  const free = [];
  for (var h = openStart; h < openEnd; h++) {
    var blocked = false;
    for (var k = 0; k < intervals.length; k++) {
      if (h >= intervals[k].start && h < intervals[k].end) {
        blocked = true;
        break;
      }
    }
    if (!blocked) free.push(h);
  }
  return free;
}

function venueHasFreeHourOnDate_(dateText, intervals, pauseRanges, holidaySet) {
  if (dateText < getTodayText_()) return false;
  if (isGloballyClosedDate_(dateText)) return false;
  if (isDateWithinAnyRange_(dateText, pauseRanges)) return false;
  const open = getVenueOpenHoursForDate_(dateText, holidaySet);
  return computeVenueFreeStartHours_(intervals || [], open.openStart, open.openEnd).length > 0;
}

function listVenueOccupiedSlots_(assetId, dateText) {
  const date = requireDateText_(dateText, "date");
  const target = getAssetOrThrow_(assetId);
  if (target.type !== "venue") throw new Error("此資產非空間，無法查詢小時可借時段");

  const intervals = getVenueBookingContext_(assetId, date);
  intervals.sort(function (a, b) {
    return a.start - b.start;
  });
  return { occupied: intervals };
}

// excludeRecordId：修改既有紀錄應歸還時間時傳入，略過「需為今天或之後」並排除自身占用
function validateVenueBooking_(assetId, startRaw, endRaw, excludeRecordId) {
  const start = requireDateTimeText_(startRaw, "空間借用開始時間");
  const end = requireDateTimeText_(endRaw, "空間借用結束時間");

  const date = getDatePart_(start);
  if (getDatePart_(end) !== date) {
    throw new Error("空間借用需於同一天內，不可跨日。");
  }
  if (getMinuteFromDateTime_(start) !== 0 || getMinuteFromDateTime_(end) !== 0) {
    throw new Error("空間借用需以整點為單位。");
  }
  if (!excludeRecordId && date < getTodayText_()) {
    throw new Error("借用日期需為今天或之後。");
  }
  ensurePeriodNotGloballyClosed_(date, date);

  const startHour = getHourFromDateTime_(start);
  const endHour = getHourFromDateTime_(end);
  if (startHour >= endHour) {
    throw new Error("結束時間需晚於開始時間。");
  }

  const holidaySet = getHolidaySet_();
  const open = getVenueOpenHoursForDate_(date, holidaySet);
  if (startHour < open.openStart || endHour > open.openEnd) {
    throw new Error(
      "該日可借時段為 " + formatHour_(open.openStart) + "-" + formatHour_(open.openEnd) + "。"
    );
  }

  const target = getAssetOrThrow_(assetId);
  if (target.status === "停用中") {
    throw new Error("資產停用中，暫不可借：" + target.name);
  }

  const pauseRanges = getPauseRangesByAssetId_()[assetId] || [];
  if (isDateWithinAnyRange_(date, pauseRanges)) {
    throw new Error("該空間此日暫停出借，請改選其他日期。");
  }
  const intervals = getVenueBookingContext_(assetId, date, excludeRecordId);
  for (var i = 0; i < intervals.length; i++) {
    if (startHour < intervals[i].end && intervals[i].start < endHour) {
      throw new Error(
        excludeRecordId
          ? "該時段與其他借用衝突，請改選其他結束時間。"
          : "該時段已被借用，請改選其他時段。"
      );
    }
  }

  return { start: start, end: end };
}

function findEquipmentPeriodConflict_(assetId, borrowedAt, expectedReturnAt, excludeRecordId) {
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const recordId = String(rows[i][0] || "").trim();
    if (excludeRecordId && recordId === excludeRecordId) continue;

    const status = String(rows[i][RECORD_COL_STATUS] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;

    const otherBorrowedAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_BORROWED_AT]));
    const otherExpectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][RECORD_COL_EXPECTED_RETURN_AT]));
    if (!otherBorrowedAt || !otherExpectedReturnAt) continue;

    if (!isDateRangeOverlapping_(otherBorrowedAt, otherExpectedReturnAt, borrowedAt, expectedReturnAt)) {
      continue;
    }

    if (String(rows[i][RECORD_COL_ASSET_ID] || "").trim() !== assetId) continue;
    return {
      recordId: recordId,
      studentId: String(rows[i][1] || "").trim(),
      studentName: String(rows[i][2] || "").trim(),
      itemName: parseLegacyItemName_(rows[i][RECORD_COL_ITEM_NAME]).name,
      borrowedAt: otherBorrowedAt,
      expectedReturnAt: otherExpectedReturnAt,
    };
  }
  return null;
}

function formatBorrowPeriodConflictMessage_(conflict) {
  return (
    "與其他借用衝突：" +
    conflict.studentName +
    "（" +
    conflict.studentId +
    "）借用 " +
    conflict.borrowedAt +
    "～" +
    conflict.expectedReturnAt +
    "（" +
    conflict.itemName +
    "）"
  );
}

function ensureAssetAvailableForPeriodExcludingRecord_(assetId, borrowedAt, expectedReturnAt, excludeRecordId) {
  const asset = getAssetOrThrow_(assetId);
  ensurePeriodNotGloballyClosed_(borrowedAt, expectedReturnAt);

  const conflict = findEquipmentPeriodConflict_(assetId, borrowedAt, expectedReturnAt, excludeRecordId);
  if (conflict) {
    throw new Error(formatBorrowPeriodConflictMessage_(conflict));
  }

  if (asset.status === "停用中") {
    throw new Error("資產停用中，暫不可借：" + asset.name);
  }

  const pauseRanges = getPauseRangesByAssetId_()[assetId] || [];
  if (isBlockedByRanges_(borrowedAt, expectedReturnAt, pauseRanges)) {
    throw new Error("借用期間與資產停用區間衝突：" + asset.name);
  }
}

function updateBorrowRecordExpectedReturnAt_(body) {
  ensureActiveStaffOperator_(body && body.operatorAccount);
  const recordId = requireField_(body && body.recordId, "recordId");
  const rawExpectedReturnAt = requireField_(body && body.expectedReturnAt, "expectedReturnAt");

  const recordSheet = getBorrowRecordsSheet_();
  const rowIndex = findRowById_(recordSheet, BORROW_RECORD_HEADERS.length, recordId);
  if (rowIndex < 0) {
    throw new Error("找不到借用紀錄");
  }

  const row = recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).getValues()[0];
  const status = String(row[RECORD_COL_STATUS] || "").trim();
  if (status !== "租借中" && status !== "待生效") {
    throw new Error("僅可修改租借中或待生效紀錄的應歸還日期");
  }

  const borrowedAt = normalizeTemporalText_(row[RECORD_COL_BORROWED_AT]);
  const assetId = String(row[RECORD_COL_ASSET_ID] || "").trim();
  if (!assetId) {
    throw new Error("紀錄缺少資產資訊");
  }

  var expectedReturnAt;

  if (getAssetTypeMap_()[assetId] === "venue") {
    expectedReturnAt = requireDateTimeText_(rawExpectedReturnAt, "expectedReturnAt");
    validateVenueBooking_(assetId, borrowedAt, expectedReturnAt, recordId);
  } else {
    expectedReturnAt = requireDateText_(rawExpectedReturnAt, "expectedReturnAt");
    const borrowedDate = getDatePart_(borrowedAt);
    if (expectedReturnAt < borrowedDate) {
      throw new Error("應歸還日期不可早於借用日期");
    }
    if (!isWorkingDayText_(expectedReturnAt, getHolidaySet_())) {
      throw new Error("應歸還日期須為工作天（週末與國定假日不可歸還設備）");
    }
    ensureAssetAvailableForPeriodExcludingRecord_(assetId, borrowedDate, expectedReturnAt, recordId);
  }

  row[RECORD_COL_EXPECTED_RETURN_AT] = expectedReturnAt;
  recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
  reconcileBorrowingState_();
  const version = bumpDataVersion_();
  return { ok: true, recordId: recordId, expectedReturnAt: expectedReturnAt, version: version };
}

function reviewBorrowApplication_(body) {
  const applicationId = requireField_(body && body.applicationId, "applicationId");
  const action = String((body && body.action) || "").trim();
  const staffName = requireField_(body && body.staffName, "staffName");
  const rejectionReason = String((body && body.rejectionReason) || "").trim();
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
  const currentStatus = String(row[APP_COL_STATUS] || "").trim();
  if (currentStatus !== "待審核") {
    throw new Error("此申請已審核，無法重複操作");
  }

  const reviewedAt = getTodayText_();
  const nextStatus = action === "approve" ? "已核准" : "已駁回";

  row[APP_COL_STATUS] = nextStatus;
  row[APP_COL_REVIEWED_BY] = staffName;
  row[APP_COL_REVIEWED_AT] = reviewedAt;
  row[APP_COL_BORROWED_AT] = normalizeTemporalText_(row[APP_COL_BORROWED_AT]);
  row[APP_COL_EXPECTED_RETURN_AT] = normalizeTemporalText_(row[APP_COL_EXPECTED_RETURN_AT]);
  row[APP_COL_REJECTION_REASON] = action === "reject" ? rejectionReason : "";
  // 審核時順手把舊格式的 itemName 前綴正規化到 itemType 欄
  const reviewedItem = resolveItemTypeAndName_(
    row[APP_COL_ITEM_TYPE],
    row[APP_COL_ITEM_NAME],
    String(row[APP_COL_ASSET_ID] || "").trim()
  );
  row[APP_COL_ITEM_NAME] = reviewedItem.itemName;
  row[APP_COL_ITEM_TYPE] = reviewedItem.itemType;

  let linkedRecordId = String(row[APP_COL_RECORD_ID] || "").trim();
  if (appType === "借用申請") {
    if (action === "approve") {
      ensureStudentEligibleForBorrow_(String(row[2] || "").trim());
      ensureApplicationStillBookable_(row);
      linkedRecordId = createBorrowRecordFromApplicationRow_(row);
      row[APP_COL_RECORD_ID] = linkedRecordId;
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
  const version = bumpDataVersion_();
  try {
    sendReviewResultEmail_(row, nextStatus, reviewedAt, staffName);
  } catch (mailError) {
    console.error("審核通知信寄送失敗：" + String(mailError.message || mailError));
  }
  return {
    ok: true,
    applicationId: applicationId,
    status: nextStatus,
    recordId: linkedRecordId || "",
    version: version,
  };
}

function ensureApplicationStillBookable_(appRow) {
  const assetId = String(appRow[APP_COL_ASSET_ID] || "").trim();
  if (!assetId) {
    throw new Error("申請缺少借用項目，無法核准。");
  }
  const borrowedAt = normalizeTemporalText_(appRow[APP_COL_BORROWED_AT]);
  const expectedReturnAt = normalizeTemporalText_(appRow[APP_COL_EXPECTED_RETURN_AT]);

  // 重新確認所選借用區間是否仍與既有紀錄重疊（避免多筆相同區間申請同時核准造成衝突）。
  if (getAssetTypeMap_()[assetId] === "venue") {
    validateVenueBooking_(assetId, borrowedAt, expectedReturnAt);
    return;
  }
  ensureAssetAvailableForPeriod_(
    assetId,
    getDatePart_(borrowedAt),
    getDatePart_(expectedReturnAt)
  );
}

function createBorrowRecordFromApplicationRow_(appRow) {
  const recordSheet = getBorrowRecordsSheet_();
  const recordId = "rec-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const borrowedAt = normalizeTemporalText_(appRow[APP_COL_BORROWED_AT]);
  const expectedReturnAt = normalizeTemporalText_(appRow[APP_COL_EXPECTED_RETURN_AT]);
  const assetId = String(appRow[APP_COL_ASSET_ID] || "").trim();
  const item = resolveItemTypeAndName_(
    appRow[APP_COL_ITEM_TYPE],
    appRow[APP_COL_ITEM_NAME],
    assetId
  );
  recordSheet.appendRow([
    recordId,
    String(appRow[2] || "").trim(),
    String(appRow[3] || "").trim(),
    formatPhoneForSheet_(appRow[4]),
    String(appRow[5] || "").trim(),
    item.itemName,
    item.itemType,
    assetId,
    borrowedAt,
    expectedReturnAt,
    "",
    getRecordStatusByBorrowDate_(borrowedAt),
    "",
    String(appRow[APP_COL_BORROWER_GROUP] || "").trim(),
    String(appRow[APP_COL_MENTOR_NAME] || "").trim(),
    String(appRow[APP_COL_ACTIVITY_NAME] || "").trim(),
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
  row[RECORD_COL_RETURNED_AT] = returnedAt;
  row[RECORD_COL_STATUS] = "已歸還";
  row[RECORD_COL_RETURN_REQUEST_STATUS] = "";
  recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
}

function markBorrowRecordReturnPending_(recordId) {
  const recordSheet = getBorrowRecordsSheet_();
  const rowIndex = findRowById_(recordSheet, BORROW_RECORD_HEADERS.length, recordId);
  if (rowIndex < 0) {
    throw new Error("找不到對應租借紀錄");
  }

  const row = recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).getValues()[0];
  const status = String(row[RECORD_COL_STATUS] || "").trim();
  if (status !== "租借中" && status !== "待生效") {
    throw new Error("此租借紀錄目前不可申請歸還");
  }
  if (String(row[RECORD_COL_RETURN_REQUEST_STATUS] || "").trim() === "待審核") {
    throw new Error("此項目已有待審核歸還申請，請等待職員審核。");
  }
  row[RECORD_COL_RETURN_REQUEST_STATUS] = "待審核";
  recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).setValues([row]);
}

function clearBorrowRecordReturnPending_(recordId) {
  const recordSheet = getBorrowRecordsSheet_();
  const rowIndex = findRowById_(recordSheet, BORROW_RECORD_HEADERS.length, recordId);
  if (rowIndex < 0) {
    throw new Error("找不到對應租借紀錄");
  }

  const row = recordSheet.getRange(rowIndex, 1, 1, BORROW_RECORD_HEADERS.length).getValues()[0];
  if (String(row[RECORD_COL_RETURN_REQUEST_STATUS] || "").trim() !== "") {
    row[RECORD_COL_RETURN_REQUEST_STATUS] = "";
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
      const borrowedAt = normalizeTemporalText_(row[RECORD_COL_BORROWED_AT]);
      const expectedReturnAt = normalizeTemporalText_(row[RECORD_COL_EXPECTED_RETURN_AT]);
      const returnedAt = normalizeDateText_(row[RECORD_COL_RETURNED_AT]);
      const returnRequestStatus =
        String(row[RECORD_COL_RETURN_REQUEST_STATUS] || "").trim() === "待審核" ? "待審核" : "";
      const currentStatus = String(row[RECORD_COL_STATUS] || "").trim();
      var nextStatus = currentStatus;

      if (row[RECORD_COL_BORROWED_AT] !== borrowedAt) {
        row[RECORD_COL_BORROWED_AT] = borrowedAt;
        hasRecordUpdates = true;
      }
      if (row[RECORD_COL_EXPECTED_RETURN_AT] !== expectedReturnAt) {
        row[RECORD_COL_EXPECTED_RETURN_AT] = expectedReturnAt;
        hasRecordUpdates = true;
      }
      if (row[RECORD_COL_RETURNED_AT] !== returnedAt) {
        row[RECORD_COL_RETURNED_AT] = returnedAt;
        hasRecordUpdates = true;
      }
      if (row[RECORD_COL_RETURN_REQUEST_STATUS] !== returnRequestStatus) {
        row[RECORD_COL_RETURN_REQUEST_STATUS] = returnRequestStatus;
        hasRecordUpdates = true;
      }

      if (returnedAt) {
        nextStatus = "已歸還";
        if (row[RECORD_COL_RETURN_REQUEST_STATUS] !== "") {
          row[RECORD_COL_RETURN_REQUEST_STATUS] = "";
          hasRecordUpdates = true;
          hasMeaningfulRecordUpdates = true;
        }
      } else if (borrowedAt && getDatePart_(borrowedAt) > todayText) {
        nextStatus = "待生效";
      } else {
        nextStatus = "租借中";
        const activeAssetId = String(row[RECORD_COL_ASSET_ID] || "").trim();
        if (activeAssetId) activeAssetIdSet[activeAssetId] = true;
      }

      if (nextStatus !== currentStatus) {
        row[RECORD_COL_STATUS] = nextStatus;
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
    invalidateAssetsCache_();
  }
  return hasAssetUpdates;
}

function getRecordStatusByBorrowDate_(borrowedAt) {
  if (!borrowedAt) return "租借中";
  return getDatePart_(borrowedAt) > getTodayText_() ? "待生效" : "租借中";
}

function getTodayText_() {
  return Utilities.formatDate(new Date(), APP_TIME_ZONE, "yyyy-MM-dd");
}

function getNowDateTimeText_() {
  return Utilities.formatDate(new Date(), APP_TIME_ZONE, "yyyy-MM-dd HH:mm");
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
  const text = String(value || "").trim();
  if (!text) throw new Error(fieldName + " 為必填");
  if (!DATE_TEXT_PATTERN.test(text)) {
    throw new Error(fieldName + " 格式需為 YYYY-MM-DD");
  }
  return text;
}

function requireDateTimeText_(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) throw new Error(fieldName + " 為必填");
  if (!DATETIME_TEXT_PATTERN.test(text)) {
    throw new Error(fieldName + " 格式需為 YYYY-MM-DD HH:mm");
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
  return "";
}

function ensureDateOnOrAfterToday_(dateText, fieldName) {
  const date = requireDateText_(dateText, fieldName);
  const todayText = getTodayText_();
  if (date < todayText) {
    throw new Error(fieldName + " 需為今天或之後");
  }
}

function getEarliestBorrowDateText_(workingDays) {
  const holidaySet = getHolidaySet_();
  var date = addDaysText_(getTodayText_(), 1);
  var count = 0;
  for (var i = 0; i < 365; i++) {
    if (!isHolidayLikeDate_(date, holidaySet)) {
      count++;
      if (count >= workingDays) return date;
    }
    date = addDaysText_(date, 1);
  }
  return date;
}

function ensureBorrowLeadTime_(borrowDate) {
  const earliest = getEarliestBorrowDateText_(BORROW_LEAD_WORKING_DAYS);
  if (getDatePart_(borrowDate) < earliest) {
    throw new Error(
      "因申請需約 " +
        BORROW_LEAD_WORKING_DAYS +
        " 個工作天作業時間（申請當日不計入），最早可借用日期為 " +
        earliest +
        "（已排除週末與國定假日）。"
    );
  }
}

function computeNextWorkingDayText_(dateText) {
  var holidaySet = getHolidaySet_();
  var date = addDaysText_(dateText, 1);
  for (var i = 0; i < 365; i++) {
    if (isWorkingDayText_(date, holidaySet)) return date;
    date = addDaysText_(date, 1);
  }
  return date;
}

function ensureDateRange_(borrowedAt, expectedReturnAt) {
  const borrowed = requireDateText_(borrowedAt, "borrowedAt");
  const expected = requireDateText_(expectedReturnAt, "expectedReturnAt");
  if (expected < borrowed) {
    throw new Error("expectedReturnAt 不可早於 borrowedAt");
  }
  const holidaySet = getHolidaySet_();
  if (!isWorkingDayText_(borrowed, holidaySet)) {
    throw new Error("borrowedAt 須為工作天（週末與國定假日不可借用設備）");
  }
  const latestReturn = computeNextWorkingDayText_(borrowed);
  if (expected > latestReturn) {
    throw new Error("expectedReturnAt 不可晚於借用日的下一個工作天（" + latestReturn + "）");
  }
  if (!isWorkingDayText_(expected, holidaySet)) {
    throw new Error("expectedReturnAt 須為工作天（週末與國定假日不可歸還設備）");
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

function normalizeTemporalText_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    // 午夜視為純日期（設備借用），其餘保留時分（空間借用）
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0;
    return Utilities.formatDate(value, APP_TIME_ZONE, hasTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd");
  }

  const text = String(value).trim();
  if (!text) return "";
  if (DATE_TEXT_PATTERN.test(text) || DATETIME_TEXT_PATTERN.test(text)) return text;
  return "";
}

function getDatePart_(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (DATETIME_TEXT_PATTERN.test(value)) return value.slice(0, 10);
  if (DATE_TEXT_PATTERN.test(value)) return value;
  return "";
}

function isVenueTemporal_(text) {
  return DATETIME_TEXT_PATTERN.test(String(text || "").trim());
}

function requireTemporalText_(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) throw new Error(fieldName + " 為必填");
  if (!DATE_TEXT_PATTERN.test(text) && !DATETIME_TEXT_PATTERN.test(text)) {
    throw new Error(fieldName + " 格式需為 YYYY-MM-DD 或 YYYY-MM-DD HH:mm");
  }
  return text;
}

function getHourFromDateTime_(text) {
  return Number(String(text).slice(11, 13));
}

function getMinuteFromDateTime_(text) {
  return Number(String(text).slice(14, 16));
}

function formatHour_(hour) {
  return String(hour).padStart(2, "0") + ":00";
}

function temporalOverlap_(aStart, aEnd, bStart, bEnd) {
  // 半開區間（結束時間不含），固定寬度字串可直接字典序比較
  return aStart < bEnd && bStart < aEnd;
}

function isWeekendDate_(dateText) {
  const date = new Date(dateText + "T00:00:00");
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isWorkingDayText_(dateText, holidaySet) {
  if (isWeekendDate_(dateText)) return false;
  const set = holidaySet || getHolidaySet_();
  return !set[dateText];
}

function isHolidayLikeDate_(dateText, holidaySet) {
  if (isWeekendDate_(dateText)) return true;
  const set = holidaySet || getHolidaySet_();
  return Boolean(set[dateText]);
}

function getVenueOpenHoursForDate_(dateText, holidaySet) {
  const openStart = isHolidayLikeDate_(dateText, holidaySet)
    ? VENUE_WEEKEND_OPEN_HOUR
    : VENUE_WEEKDAY_OPEN_HOUR;
  return { openStart: openStart, openEnd: VENUE_CLOSE_HOUR };
}

function getAssetTypeMap_() {
  if (assetTypeMapCache_) {
    return assetTypeMapCache_;
  }
  const map = {};
  const assets = readAssets_();
  for (var i = 0; i < assets.length; i++) {
    map[assets[i].id] = assets[i].type;
  }
  assetTypeMapCache_ = map;
  return assetTypeMapCache_;
}

function normalizeItemType_(raw) {
  const text = String(raw || "").trim();
  return VALID_TYPES.indexOf(text) >= 0 ? text : "";
}

function formatItemTypeLabel_(itemType) {
  return ITEM_TYPE_LABELS[normalizeItemType_(itemType)] || "";
}

// 將舊格式「空間:名稱」拆成 { type, name }；沒有前綴時 type 為空字串
function parseLegacyItemName_(raw) {
  const text = String(raw || "").trim();
  const match = LEGACY_ITEM_NAME_PREFIX_PATTERN.exec(text);
  if (!match) return { type: "", name: text };
  const prefix = match[1];
  const type = prefix === "空間" || prefix === "場地" ? "venue" : "equipment";
  return { type: type, name: text.slice(match[0].length).trim() };
}

// 以 itemType 欄位為主，缺少時依序退回：舊 itemName 前綴 → assets 表資產類型
function resolveItemTypeAndName_(rawItemType, rawItemName, assetId) {
  const legacy = parseLegacyItemName_(rawItemName);
  let type = normalizeItemType_(rawItemType) || legacy.type;
  if (!type && assetId) {
    type = normalizeItemType_(getAssetTypeMap_()[assetId]);
  }
  return { itemType: type, itemName: legacy.name };
}

// 一次性遷移：將 borrow_applications / borrow_records 既有列的 itemName 前綴拆到 itemType 欄。
// 可在 Apps Script 編輯器手動執行；未執行前讀取端也會自動退回解析前綴，不影響功能。
function migrateItemNameTypeSplit() {
  const summary = {
    applications: migrateItemTypeColumnForSheet_(
      getBorrowApplicationsSheet_(),
      BORROW_APPLICATION_HEADERS.length,
      APP_COL_ITEM_NAME,
      APP_COL_ITEM_TYPE,
      APP_COL_ASSET_ID
    ),
    records: migrateItemTypeColumnForSheet_(
      getBorrowRecordsSheet_(),
      BORROW_RECORD_HEADERS.length,
      RECORD_COL_ITEM_NAME,
      RECORD_COL_ITEM_TYPE,
      RECORD_COL_ASSET_ID
    ),
  };
  if (summary.applications > 0 || summary.records > 0) {
    summary.version = bumpDataVersion_();
  }
  console.log("itemName/itemType 遷移完成：" + JSON.stringify(summary));
  return summary;
}


// 依表頭名稱重排欄位，支援：無 itemType、itemType 在末欄、或已是目標順序。
function ensureBorrowSheetColumnLayout_(sheet, desiredHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), desiredHeaders.length);
  const currentHeaders = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function (h) {
      return String(h || "").trim();
    });
  var alreadyMatched = desiredHeaders.length === currentHeaders.length;
  if (alreadyMatched) {
    for (var i = 0; i < desiredHeaders.length; i++) {
      if (currentHeaders[i] !== desiredHeaders[i]) {
        alreadyMatched = false;
        break;
      }
    }
  }
  if (alreadyMatched) return false;

  const oldIndexByName = {};
  for (var c = 0; c < currentHeaders.length; c++) {
    if (currentHeaders[c]) oldIndexByName[currentHeaders[c]] = c;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    sheet.clear();
    sheet.getRange(1, 1, 1, desiredHeaders.length).setValues([desiredHeaders]);
    sheet.setFrozenRows(1);
    return true;
  }

  const oldData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const newData = [];
  for (var r = 0; r < oldData.length; r++) {
    const newRow = [];
    for (var h = 0; h < desiredHeaders.length; h++) {
      if (r === 0) {
        newRow.push(desiredHeaders[h]);
      } else {
        const oldIdx = oldIndexByName[desiredHeaders[h]];
        newRow.push(oldIdx === undefined ? "" : oldData[r][oldIdx]);
      }
    }
    newData.push(newRow);
  }

  sheet.clear();
  sheet.getRange(1, 1, newData.length, desiredHeaders.length).setValues(newData);
  sheet.setFrozenRows(1);
  return true;
}

function migrateItemTypeColumnForSheet_(sheet, columnCount, nameCol, typeCol, assetIdCol) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const range = sheet.getRange(2, 1, lastRow - 1, columnCount);
  const rows = range.getValues();
  let updated = 0;
  for (var i = 0; i < rows.length; i++) {
    if (!String(rows[i][0] || "").trim()) continue;
    const resolved = resolveItemTypeAndName_(
      rows[i][typeCol],
      rows[i][nameCol],
      String(rows[i][assetIdCol] || "").trim()
    );
    const currentName = String(rows[i][nameCol] || "").trim();
    const currentType = String(rows[i][typeCol] || "").trim();
    if (currentName === resolved.itemName && currentType === resolved.itemType) continue;
    rows[i][nameCol] = resolved.itemName;
    rows[i][typeCol] = resolved.itemType;
    updated++;
  }
  if (updated > 0) range.setValues(rows);
  return updated;
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

function formatPhoneForSheet_(raw) {
  const phone = normalizePhoneText_(raw);
  return phone ? "'" + phone : "";
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
  getHolidaysSheet_();
  getGlobalPauseSheet_();
  getStudentBlocksSheet_();
  Logger.log("borrow_applications / borrow_records / holidays / global_pause_ranges / student_borrow_blocks 分頁已就緒");
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
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    let version = String(props.getProperty(DATA_VERSION_KEY) || "").trim();
    if (!version) {
      version = "1";
      props.setProperty(DATA_VERSION_KEY, version);
    }
    return version;
  } finally {
    lock.releaseLock();
  }
}

function bumpDataVersion_() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const nextVersion = String(Number(props.getProperty(DATA_VERSION_KEY) || 0) + 1);
    props.setProperty(DATA_VERSION_KEY, nextVersion);
    return nextVersion;
  } finally {
    lock.releaseLock();
  }
}
