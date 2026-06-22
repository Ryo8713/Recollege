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
    "此信件由系統自動發送，請勿直接回覆。\n" +
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
