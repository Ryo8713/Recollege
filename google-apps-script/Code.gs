const SHEET_ASSETS = "assets";
const SHEET_ASSET_PAUSES = "asset_pause_ranges";
const SHEET_BORROW_APPLICATIONS = "borrow_applications";
const SHEET_BORROW_RECORDS = "borrow_records";
const SHEET_STAFF_ACCOUNTS = "staff_accounts";
const SHEET_HOLIDAYS = "holidays";
const SHEET_GLOBAL_PAUSES = "global_pause_ranges";
const ASSET_HEADERS = ["id", "name", "type", "status", "createdAt"];
const ASSET_PAUSE_HEADERS = ["id", "assetId", "startDate", "endDate", "note", "createdAt"];
const HOLIDAY_HEADERS = ["date", "note", "createdAt", "createdBy"];
const GLOBAL_PAUSE_HEADERS = ["id", "startDate", "endDate", "note", "createdAt", "createdBy"];
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
  "rejectionReason",
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
const STAFF_ACCOUNT_HEADERS = ["account", "password", "role", "status", "createdAt", "createdBy", "name"];
const STAFF_ACCOUNT_STATUS_ACTIVE = "active";
const STAFF_ACCOUNT_DEFAULT_ADMIN = "admin";
const STAFF_ACCOUNT_DEFAULT_ADMIN_PASSWORD = "1234";
const APP_TIME_ZONE = "Asia/Taipei";
const DATE_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_TEXT_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const DATA_VERSION_KEY = "dataVersion";
const FAR_FUTURE_BLOCKED_END_DATE = "9999-12-31";

// 空間（venue）以小時計的營業時段（24 小時制整點）
// 平日：可借 1700-2300；假日／國定假日：可借 0800-2300
const VENUE_WEEKDAY_OPEN_HOUR = 17;
const VENUE_WEEKEND_OPEN_HOUR = 8;
const VENUE_CLOSE_HOUR = 23;

// 申請需要作業時間：最早可借用日 = 從今天起算的第 N 個工作天（跳過週末與國定假日）
const BORROW_LEAD_WORKING_DAYS = 3;

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

    if (path === "venue-availability" && method === "GET") {
      const assetId = requireField_(e && e.parameter && e.parameter.assetId, "assetId");
      const date = requireField_(e && e.parameter && e.parameter.date, "date");
      return jsonResponse_(listVenueAvailability_(assetId, date));
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
  // 空間以小時計，borrowedAt/expectedReturnAt 可能為「YYYY-MM-DD HH:mm」，需存為純文字
  ensureColumnAsText_(sheet, 9); // borrowedAt
  ensureColumnAsText_(sheet, 10); // expectedReturnAt
  return sheet;
}

function getBorrowRecordsSheet_() {
  const sheet = getSheetWithHeaders_(SHEET_BORROW_RECORDS, BORROW_RECORD_HEADERS);
  ensureColumnAsText_(sheet, 4); // studentPhone
  // 空間以小時計，borrowedAt/expectedReturnAt 可能為「YYYY-MM-DD HH:mm」，需存為純文字
  ensureColumnAsText_(sheet, 8); // borrowedAt
  ensureColumnAsText_(sheet, 9); // expectedReturnAt
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

function deleteAsset_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator || operator.status !== STAFF_ACCOUNT_STATUS_ACTIVE) {
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
  bumpDataVersion_();
  return { ok: true, assetId: assetId, name: assetName };
}

function ensureAssetCanBeDeleted_(assetId) {
  const applications = readBorrowApplications_();
  for (var i = 0; i < applications.length; i++) {
    const app = applications[i];
    if (app.status !== "待審核") continue;
    if (app.assetIds.indexOf(assetId) >= 0) {
      throw new Error("此資產仍有待審核申請，請先完成審核後再刪除。");
    }
  }

  const records = readBorrowRecords_();
  for (var r = 0; r < records.length; r++) {
    const record = records[r];
    if (record.status !== "租借中" && record.status !== "待生效") continue;
    if (record.assetIds.indexOf(assetId) >= 0) {
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
  if (!operator || operator.status !== STAFF_ACCOUNT_STATUS_ACTIVE) {
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

  const createdAt = new Date().toISOString();
  sheet.appendRow([date, note, createdAt, operator.account]);
  bumpDataVersion_();
  return { ok: true, date: date, note: note, createdAt: createdAt, createdBy: operator.account };
}

function deleteHoliday_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator || operator.status !== STAFF_ACCOUNT_STATUS_ACTIVE) {
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
      bumpDataVersion_();
      return { ok: true, date: date };
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
    const status = String(rows[i][10] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;
    const borrowedAt = getDatePart_(normalizeTemporalText_(rows[i][7]));
    const expectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][8]));
    if (!borrowedAt || !expectedReturnAt) continue;
    if (isDateRangeOverlapping_(borrowedAt, expectedReturnAt, pauseStartDate, pauseEndDate)) {
      throw new Error("此暫停區間與既有借用紀錄衝突，請先處理相關借用。");
    }
  }
}

function createGlobalPauseRange_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator || operator.status !== STAFF_ACCOUNT_STATUS_ACTIVE) {
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
  const createdAt = new Date().toISOString();
  sheet.appendRow([id, startDate, endDate, note, createdAt, operator.account]);
  bumpDataVersion_();
  return {
    id: id,
    startDate: startDate,
    endDate: endDate,
    note: note,
    createdAt: createdAt,
    createdBy: operator.account,
  };
}

function deleteGlobalPauseRange_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const operator = findStaffAccount_(operatorAccount);
  if (!operator || operator.status !== STAFF_ACCOUNT_STATUS_ACTIVE) {
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
      bumpDataVersion_();
      return { ok: true, id: id };
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
      name: String(rows[i][6] || account).trim(),
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
    name: staff.name || staff.account,
  };
}

function createStaffAccount_(body) {
  const operatorAccount = requireField_(body && body.operatorAccount, "operatorAccount");
  const account = requireField_(body && body.account, "account");
  const password = requireField_(body && body.password, "password");
  const name = requireField_(body && body.name, "name");

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
  sheet.appendRow([account, password, "staff", STAFF_ACCOUNT_STATUS_ACTIVE, createdAt, operator.account, name]);
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
    const currentAccount = String(rows[i][0] || "").trim();
    if (currentAccount !== target) continue;
    return {
      account: currentAccount,
      password: String(rows[i][1] || "").trim(),
      role: String(rows[i][2] || "staff").trim(),
      status: String(rows[i][3] || STAFF_ACCOUNT_STATUS_ACTIVE).trim(),
      createdAt: String(rows[i][4] || "").trim(),
      createdBy: String(rows[i][5] || "").trim(),
      name: String(rows[i][6] || currentAccount).trim(),
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
      STAFF_ACCOUNT_DEFAULT_ADMIN,
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
    STAFF_ACCOUNT_DEFAULT_ADMIN,
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
    const reviewedAt = normalizeDateText_(row[13]);

    const app = {
      id: id,
      type: type,
      studentId: String(row[2] || "").trim(),
      studentName: String(row[3] || "").trim(),
      studentPhone: normalizePhoneText_(row[4]),
      studentEmail: String(row[5] || "").trim(),
      itemName: String(row[6] || "").trim(),
      assetIds: parseStringArray_(row[7]),
      borrowedAt: normalizeTemporalText_(row[8]),
      expectedReturnAt: normalizeTemporalText_(row[9]),
      status: VALID_APPLICATION_STATUS.indexOf(status) >= 0 ? status : "待審核",
      createdAt: normalizeTemporalText_(row[11]),
      borrowerGroup: String(row[15] || "").trim(),
      mentorName: String(row[16] || "").trim(),
      activityName: String(row[17] || "").trim(),
      rejectionReason: String(row[18] || "").trim(),
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
      borrowedAt: normalizeTemporalText_(row[7]),
      expectedReturnAt: normalizeTemporalText_(row[8]),
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
  const assetIds = normalizeIdArray_(body && body.assetIds, "assetIds");
  const recordId = String((body && body.recordId) || "").trim();
  const assetTypeMap = getAssetTypeMap_();
  const primaryAssetType = assetTypeMap[assetIds[0]];

  let borrowedAt;
  let expectedReturnAt;

  if (type === "借用申請") {
    if (!borrowerGroup) {
      throw new Error("borrowerGroup 為必填");
    }
    if (!activityName) {
      throw new Error("activityName 為必填");
    }
    if (primaryAssetType === "venue") {
      const booking = validateVenueBooking_(
        assetIds[0],
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
      ensureAssetsAvailableForPeriod_(assetIds, borrowedAt, expectedReturnAt);
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
  const createdAt = new Date().toISOString();

  const sheet = getBorrowApplicationsSheet_();
  sheet.appendRow([
    applicationId,
    type,
    studentId,
    studentName,
    formatPhoneForSheet_(studentPhone),
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
    "",
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
  if (isGloballyClosedDate_(borrowedAt)) {
    return { venues: [], equipments: [] };
  }

  const assets = readAssets_();
  const blockedRangeMap = getBlockedRangesByAssetId_();
  const holidaySet = getHolidaySet_();
  const venues = [];
  const equipments = [];

  for (var i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (asset.status === "停用中") continue;

    if (asset.type === "venue") {
      const context = getVenueBookingContext_(asset.id);
      if (venueHasFreeHourOnDate_(borrowedAt, context, holidaySet)) {
        venues.push(asset);
      }
      continue;
    }

    const blockedRanges = getAssetBlockedRanges_(asset.id, blockedRangeMap);
    const globalPauseRanges = getGlobalPauseRanges_();
    let hasAvailableReturnDate = false;
    for (var offset = 0; offset <= 6; offset++) {
      const expectedReturnAt = addDaysText_(borrowedAt, offset);
      if (isBlockedByRanges_(borrowedAt, expectedReturnAt, globalPauseRanges)) continue;
      if (!isBlockedByRanges_(borrowedAt, expectedReturnAt, blockedRanges)) {
        hasAvailableReturnDate = true;
        break;
      }
    }

    if (!hasAvailableReturnDate) continue;
    equipments.push(asset);
  }

  return { venues: venues, equipments: equipments };
}

function ensureAssetsAvailableForPeriod_(assetIds, borrowedAt, expectedReturnAt) {
  const assets = readAssets_();
  const assetMap = {};
  for (var i = 0; i < assets.length; i++) {
    assetMap[assets[i].id] = assets[i];
  }

  ensurePeriodNotGloballyClosed_(borrowedAt, expectedReturnAt);
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
  const assetTypeMap = getAssetTypeMap_();

  const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
  for (var i = 0; i < rows.length; i++) {
    const status = String(rows[i][10] || "").trim();
    if (status !== "租借中" && status !== "待生效") continue;

    const borrowedAt = getDatePart_(normalizeTemporalText_(rows[i][7]));
    const expectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][8]));
    if (!borrowedAt || !expectedReturnAt) continue;
    const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

    if (isDateRangeOverlapping_(borrowedAt, effectiveEndAt, targetBorrowedAt, targetExpectedReturnAt)) {
      const ids = parseStringArray_(rows[i][6]);
      for (var a = 0; a < ids.length; a++) {
        // 空間以小時計，衝突由 venue 專用流程處理，此處僅處理設備
        if (assetTypeMap[ids[a]] === "venue") continue;
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

  const globalPauseRanges = getGlobalPauseRanges_();
  if (targetAsset.type === "venue") {
    const venueContext = getVenueBookingContext_(assetId);
    const venueHolidaySet = getHolidaySet_();
    const venueDates = [];
    for (var vd = 0; vd < windowDays; vd++) {
      const venueDate = addDaysText_(fromDate, vd);
      if (isGloballyClosedDate_(venueDate, globalPauseRanges)) continue;
      if (venueHasFreeHourOnDate_(venueDate, venueContext, venueHolidaySet)) {
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
    var hasAvailableReturnDate = false;
    for (var offset = 0; offset <= 6; offset++) {
      const expectedReturnAt = addDaysText_(startDate, offset);
      if (isBlockedByRanges_(startDate, expectedReturnAt, globalPauseRanges)) continue;
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
  if (isGloballyClosedDate_(borrowedAt)) {
    return { assetId: assetId, borrowedAt: borrowedAt, dates: [] };
  }
  if (targetAsset.type === "venue") {
    // 空間以小時計，歸還日由 venue-availability 端點處理
    return { assetId: assetId, borrowedAt: borrowedAt, dates: [] };
  }

  const blockedRanges = getAssetBlockedRanges_(assetId);
  const globalPauseRanges = getGlobalPauseRanges_();
  const dates = [];
  for (var offset = 0; offset <= 6; offset++) {
    const expectedReturnAt = addDaysText_(borrowedAt, offset);
    if (isBlockedByRanges_(borrowedAt, expectedReturnAt, globalPauseRanges)) continue;
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
      const status = String(rows[i][10] || "").trim();
      if (status !== "租借中" && status !== "待生效") continue;
      const borrowedAt = getDatePart_(normalizeTemporalText_(rows[i][7]));
      const expectedReturnAt = getDatePart_(normalizeTemporalText_(rows[i][8]));
      if (!borrowedAt || !expectedReturnAt) continue;
      const effectiveEndAt = getEffectiveBlockedRangeEndDate_(status, expectedReturnAt, todayText);

      const assetIds = parseStringArray_(rows[i][6]);
      for (var a = 0; a < assetIds.length; a++) {
        const currentAssetId = assetIds[a];
        if (assetTypeMap[currentAssetId] === "venue") continue;
        if (!blockedRangeMap[currentAssetId]) {
          blockedRangeMap[currentAssetId] = [];
        }
        blockedRangeMap[currentAssetId].push({ start: borrowedAt, end: effectiveEndAt });
      }
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

function getVenueBookingContext_(assetId) {
  const intervalsByDate = {};
  const sheet = getBorrowRecordsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, BORROW_RECORD_HEADERS.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      const status = String(rows[i][10] || "").trim();
      if (status !== "租借中" && status !== "待生效") continue;
      const ids = parseStringArray_(rows[i][6]);
      if (ids.indexOf(assetId) < 0) continue;
      const start = normalizeTemporalText_(rows[i][7]);
      const end = normalizeTemporalText_(rows[i][8]);
      if (!isVenueTemporal_(start) || !isVenueTemporal_(end)) continue;
      const date = getDatePart_(start);
      if (!intervalsByDate[date]) intervalsByDate[date] = [];
      intervalsByDate[date].push({
        startHour: getHourFromDateTime_(start),
        endHour: getHourFromDateTime_(end),
      });
    }
  }
  const pauseMap = getPauseRangesByAssetId_();
  return { intervalsByDate: intervalsByDate, pauseRanges: pauseMap[assetId] || [] };
}

function isDateWithinAnyRange_(dateText, ranges) {
  for (var i = 0; i < ranges.length; i++) {
    if (ranges[i].start <= dateText && dateText <= ranges[i].end) return true;
  }
  return false;
}

function computeVenueFreeStartHours_(intervals, openStart, openEnd, minStartHour) {
  const free = [];
  const effectiveOpenStart =
    typeof minStartHour === "number" ? Math.max(openStart, minStartHour) : openStart;
  for (var h = effectiveOpenStart; h < openEnd; h++) {
    var blocked = false;
    for (var k = 0; k < intervals.length; k++) {
      if (h >= intervals[k].startHour && h < intervals[k].endHour) {
        blocked = true;
        break;
      }
    }
    if (!blocked) free.push(h);
  }
  return free;
}

function venueHasFreeHourOnDate_(dateText, context, holidaySet) {
  if (dateText < getTodayText_()) return false;
  if (isGloballyClosedDate_(dateText)) return false;
  if (isDateWithinAnyRange_(dateText, context.pauseRanges)) return false;
  const open = getVenueOpenHoursForDate_(dateText, holidaySet);
  const intervals = context.intervalsByDate[dateText] || [];
  return (
    computeVenueFreeStartHours_(
      intervals,
      open.openStart,
      open.openEnd,
      getVenueMinimumStartHourForDate_(dateText)
    ).length > 0
  );
}

function listVenueAvailability_(assetId, dateText) {
  const date = requireDateText_(dateText, "date");
  const assets = readAssets_();
  const target = assets.find(function (asset) {
    return asset.id === assetId;
  });
  if (!target) throw new Error("找不到資產：" + assetId);
  if (target.type !== "venue") throw new Error("此資產非空間，無法查詢小時可借時段");

  const holidaySet = getHolidaySet_();
  const open = getVenueOpenHoursForDate_(date, holidaySet);
  const base = {
    assetId: assetId,
    date: date,
    openStart: formatHour_(open.openStart),
    openEnd: formatHour_(open.openEnd),
    isHoliday: isHolidayLikeDate_(date, holidaySet),
    occupied: [],
    closed: false,
  };

  if (target.status === "停用中" || date < getTodayText_()) {
    base.closed = true;
    return base;
  }

  if (isGloballyClosedDate_(date)) {
    base.closed = true;
    base.occupied = [{ start: formatHour_(open.openStart), end: formatHour_(open.openEnd) }];
    return base;
  }

  const context = getVenueBookingContext_(assetId);
  if (isDateWithinAnyRange_(date, context.pauseRanges)) {
    base.occupied = [{ start: formatHour_(open.openStart), end: formatHour_(open.openEnd) }];
    return base;
  }

  const minimumStartHour = getVenueMinimumStartHourForDate_(date);
  if (typeof minimumStartHour === "number" && minimumStartHour > open.openStart) {
    base.occupied.push({
      start: formatHour_(open.openStart),
      end: formatHour_(Math.min(minimumStartHour, open.openEnd)),
    });
  }

  const intervals = context.intervalsByDate[date] || [];
  base.occupied = base.occupied
    .concat(intervals.map(function (iv) {
      return { start: formatHour_(iv.startHour), end: formatHour_(iv.endHour) };
    }))
    .sort(function (a, b) {
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
    });
  return base;
}

function validateVenueBooking_(assetId, startRaw, endRaw) {
  const start = normalizeTemporalText_(startRaw);
  const end = normalizeTemporalText_(endRaw);
  if (!DATETIME_TEXT_PATTERN.test(start)) {
    throw new Error("空間借用開始時間格式需為 YYYY-MM-DD HH:mm");
  }
  if (!DATETIME_TEXT_PATTERN.test(end)) {
    throw new Error("空間借用結束時間格式需為 YYYY-MM-DD HH:mm");
  }

  const date = getDatePart_(start);
  if (getDatePart_(end) !== date) {
    throw new Error("空間借用需於同一天內，不可跨日。");
  }
  if (getMinuteFromDateTime_(start) !== 0 || getMinuteFromDateTime_(end) !== 0) {
    throw new Error("空間借用需以整點為單位。");
  }
  if (date < getTodayText_()) {
    throw new Error("借用日期需為今天或之後。");
  }
  ensurePeriodNotGloballyClosed_(date, date);

  const startHour = getHourFromDateTime_(start);
  const endHour = getHourFromDateTime_(end);
  if (startHour >= endHour) {
    throw new Error("結束時間需晚於開始時間。");
  }

  const minimumStartHour = getVenueMinimumStartHourForDate_(date);
  if (typeof minimumStartHour === "number" && startHour < minimumStartHour) {
    throw new Error("此時段已開始或已結束，請改選之後的時段。");
  }

  const holidaySet = getHolidaySet_();
  const open = getVenueOpenHoursForDate_(date, holidaySet);
  if (startHour < open.openStart || endHour > open.openEnd) {
    throw new Error(
      "該日可借時段為 " + formatHour_(open.openStart) + "-" + formatHour_(open.openEnd) + "。"
    );
  }

  const assets = readAssets_();
  const target = assets.find(function (asset) {
    return asset.id === assetId;
  });
  if (!target) throw new Error("找不到資產：" + assetId);
  if (target.status === "停用中") {
    throw new Error("資產停用中，暫不可借：" + target.name);
  }

  const context = getVenueBookingContext_(assetId);
  if (isDateWithinAnyRange_(date, context.pauseRanges)) {
    throw new Error("該空間此日暫停出借，請改選其他日期。");
  }
  const intervals = context.intervalsByDate[date] || [];
  for (var i = 0; i < intervals.length; i++) {
    if (startHour < intervals[i].endHour && intervals[i].startHour < endHour) {
      throw new Error("該時段已被借用，請改選其他時段。");
    }
  }

  return { start: start, end: end };
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
  const currentStatus = String(row[10] || "").trim();
  if (currentStatus !== "待審核") {
    throw new Error("此申請已審核，無法重複操作");
  }

  const reviewedAt = getTodayText_();
  const nextStatus = action === "approve" ? "已核准" : "已駁回";

  row[10] = nextStatus;
  row[12] = staffName;
  row[13] = reviewedAt;
  row[8] = normalizeTemporalText_(row[8]);
  row[9] = normalizeTemporalText_(row[9]);
  row[18] = action === "reject" ? rejectionReason : "";

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
  };
}

function sendReviewResultEmail_(appRow, nextStatus, reviewedAt, staffName) {
  const appType = String(appRow[1] || "").trim();
  const studentId = String(appRow[2] || "").trim();
  const studentName = String(appRow[3] || "").trim();
  const studentEmail = String(appRow[5] || "").trim();
  const itemName = String(appRow[6] || "").trim();
  const borrowedAt = normalizeTemporalText_(appRow[8]);
  const expectedReturnAt = normalizeTemporalText_(appRow[9]);
  const borrowerGroup = String(appRow[15] || "").trim();
  const mentorName = String(appRow[16] || "").trim();
  const activityName = String(appRow[17] || "").trim();
  const rejectionReason = String(appRow[18] || "").trim();

  if (!studentEmail) return;

  const subject = "【住宿書院管理系統】" + appType + nextStatus;
  const resultText = nextStatus === "已核准" ? "已核准" : "已駁回";
  const rejectionReasonLine =
    nextStatus === "已駁回" ? "駁回原因：" + (rejectionReason || "未填寫") + "\n" : "";
  const body =
    (studentName || "同學") +
    " 您好：\n\n" +
    "您的" +
    appType +
    resultText +
    "。\n\n" +
    rejectionReasonLine +
    "借用項目：" +
    formatItemNameForEmail_(itemName) +
    "\n" +
    "借用期間：" +
    formatReviewPeriodForEmail_(borrowedAt, expectedReturnAt) +
    "\n" +
    "借用人：" +
    (studentName || "未填寫") +
    "（" +
    (studentId || "未填寫") +
    "）" +
    "\n" +
    "活動名稱：" +
    (activityName || "未填寫") +
    "\n" +
    "借用團體：" +
    (borrowerGroup || "未填寫") +
    "\n" +
    (mentorName ? "負責導師：" + mentorName + "\n" : "") +
    "\n" +
    "如有疑問，請洽住宿書院管理人員。";

  MailApp.sendEmail(studentEmail, subject, body);
}

function formatItemNameForEmail_(itemName) {
  return String(itemName || "").replace(/^(空間|場地|設備|器材)\s*[:：]\s*/, "").trim() || "未記錄";
}

function formatReviewPeriodForEmail_(start, end) {
  const startText = String(start || "").trim();
  const endText = String(end || "").trim();
  const startDateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(startText);
  const endDateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(endText);
  if (startDateTime && endDateTime && startText.slice(0, 10) === endText.slice(0, 10)) {
    return (
      formatDateForEmail_(startText.slice(0, 10)) +
      " " +
      startDateTime[4] +
      " - " +
      endDateTime[4]
    );
  }
  return formatTemporalForEmail_(startText) + " - " + formatTemporalForEmail_(endText);
}

function formatTemporalForEmail_(value) {
  const text = String(value || "").trim();
  const dateTime = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/.exec(text);
  if (dateTime) {
    return formatDateForEmail_(text.slice(0, 10)) + " " + dateTime[4];
  }
  return formatDateForEmail_(text);
}

function formatDateForEmail_(value) {
  const text = String(value || "").trim();
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!date) return text || "未記錄";
  return date[1] + "年" + Number(date[2]) + "月" + Number(date[3]) + "日";
}

function createBorrowRecordFromApplicationRow_(appRow) {
  const recordSheet = getBorrowRecordsSheet_();
  const recordId = "rec-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  const borrowedAt = normalizeTemporalText_(appRow[8]);
  const expectedReturnAt = normalizeTemporalText_(appRow[9]);
  recordSheet.appendRow([
    recordId,
    String(appRow[2] || "").trim(),
    String(appRow[3] || "").trim(),
    formatPhoneForSheet_(appRow[4]),
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
      const borrowedAt = normalizeTemporalText_(row[7]);
      const expectedReturnAt = normalizeTemporalText_(row[8]);
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
      } else if (borrowedAt && getDatePart_(borrowedAt) > todayText) {
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
  return getDatePart_(borrowedAt) > getTodayText_() ? "待生效" : "租借中";
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

function getEarliestBorrowDateText_(workingDays) {
  const holidaySet = getHolidaySet_();
  var date = getTodayText_();
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
        " 個工作天作業時間，最早可借用日期為 " +
        earliest +
        "（已排除週末與國定假日）。"
    );
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

function normalizeTemporalText_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_TIME_ZONE, "yyyy-MM-dd HH:mm");
  }
  return String(value).trim();
}

function getDatePart_(text) {
  const value = String(text || "").trim();
  if (DATETIME_TEXT_PATTERN.test(value)) return value.slice(0, 10);
  if (DATE_TEXT_PATTERN.test(value)) return value;
  return value.slice(0, 10);
}

function isVenueTemporal_(text) {
  return DATETIME_TEXT_PATTERN.test(String(text || "").trim());
}

function requireTemporalText_(value, fieldName) {
  const text = normalizeTemporalText_(value);
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

function getVenueMinimumStartHourForDate_(dateText) {
  const nowText = Utilities.formatDate(new Date(), APP_TIME_ZONE, "yyyy-MM-dd HH:mm");
  if (dateText !== nowText.slice(0, 10)) return null;
  const currentHour = Number(nowText.slice(11, 13));
  const currentMinute = Number(nowText.slice(14, 16));
  return currentMinute > 0 ? currentHour + 1 : currentHour;
}

function getAssetTypeMap_() {
  const map = {};
  const assets = readAssets_();
  for (var i = 0; i < assets.length; i++) {
    map[assets[i].id] = assets[i].type;
  }
  return map;
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
  getHolidaysSheet_();
  getGlobalPauseSheet_();
  Logger.log("borrow_applications / borrow_records / holidays / global_pause_ranges 分頁已就緒");
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
