/**
 * timeUtils.js — סטנדרט זמנים אחיד לכל המערכת
 *
 * כלל יסוד:
 *   - ה-DB שומר UTC בלבד
 *   - כל חישובי SLA/diff עובדים על epoch ms בלבד: Date.now() / .getTime()
 *   - תצוגה למשתמש: Intl.DateTimeFormat עם timeZone:'Asia/Jerusalem' בלבד
 *
 * ❌ NEVER: new Date(str.toLocaleString("en-US", {timeZone})) — גורם ל-double-offset bug!
 * ❌ NEVER: גישה ל-getIsraelUtcOffsetMs דרך toLocaleString → new Date()
 */

export const TZ = "Asia/Jerusalem";
export const SLA_MINUTES = 30;

/**
 * מחשב את ה-UTC offset של Israel timezone במילישניות (DST-safe).
 *
 * ✅ שיטה בטוחה: השוואת מחרוזות שנה/חודש/יום/שעה בין UTC ל-Israel,
 *    ללא parse חזרה ל-Date.
 */
export function getIsraelUtcOffsetMs() {
  const now = new Date();
  // קריאת השדות במספרים ישירות מ-Intl — ללא המרת מחרוזת
  const ilParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).formatToParts(now);

  const get = (type) => parseInt(ilParts.find(p => p.type === type)?.value || "0", 10);
  let h = get("hour");
  // midnight edge: Intl reports "24" for midnight in some locales
  if (h === 24) h = 0;

  const ilMs = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    h, get("minute"), get("second")
  );
  return ilMs - now.getTime(); // positive = Israel is ahead of UTC
}

/**
 * המרת "YYYY-MM-DDTHH:mm" (זמן ישראל) → UTC ISO string.
 * DST-safe: משתמש ב-Intl.DateTimeFormat.formatToParts בלבד, ללא toLocaleString.
 *
 * @param {string} localStr - "2025-06-10T09:00" (זמן ישראל)
 * @returns {string} UTC ISO string
 */
export function israelLocalToUtcIso(localStr) {
  if (!localStr) return null;
  // Parse "2025-06-10T09:00" — treat as Israel time, get actual UTC
  // Step 1: parse as if UTC
  const asIfUtcMs = new Date(localStr + ":00Z").getTime();
  // Step 2: find the Israel offset at that approximate point in time
  // Use a Date near that timestamp to get the correct DST offset
  const approxDate = new Date(asIfUtcMs);
  const offsetMs = getIsraelUtcOffsetForDate(approxDate);
  // Step 3: actual UTC = asIfUtc - offset
  return new Date(asIfUtcMs - offsetMs).toISOString();
}

/**
 * מחזיר את ה-UTC offset של Israel timezone עבור תאריך ספציפי (DST-safe).
 */
export function getIsraelUtcOffsetForDate(date) {
  const ilParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = (type) => parseInt(ilParts.find(p => p.type === type)?.value || "0", 10);
  let h = get("hour");
  if (h === 24) h = 0;

  const ilMs = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    h, get("minute"), get("second")
  );
  return ilMs - date.getTime();
}

/**
 * מחשב הפרש בדקות בין utcDateStr לעכשיו (UTC-only, DST-safe).
 */
export function minutesSince(utcDateStr) {
  if (!utcDateStr) return 0;
  return (Date.now() - new Date(utcDateStr).getTime()) / 60000;
}

/**
 * בדיקת SLA: האם עברו יותר מ-threshold דקות?
 */
export function isSlaBreached(utcDateStr, thresholdMinutes = SLA_MINUTES) {
  return minutesSince(utcDateStr) >= thresholdMinutes;
}

/**
 * בדיקה: האם utcDateStr כבר עבר?
 */
export function isPast(utcDateStr) {
  if (!utcDateStr) return false;
  return new Date(utcDateStr).getTime() <= Date.now();
}

/**
 * בדיקה: האם utcDateStr נופל היום לפי Israel timezone (DST-safe)?
 */
export function isTodayInIsrael(utcDateStr) {
  if (!utcDateStr) return false;
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const targetStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(utcDateStr));
  return todayStr === targetStr;
}

/**
 * מחזיר timestamp UTC של סוף היום לפי Israel timezone.
 */
export function endOfTodayUtcMs() {
  const now = new Date();
  const ilParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour12: false
  }).formatToParts(now);
  const get = (type) => parseInt(ilParts.find(p => p.type === type)?.value || "0", 10);
  // End of today in Israel = midnight of tomorrow in Israel
  const tomorrowMidnightIL = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + 1, 0, 0, 0));
  const offsetMs = getIsraelUtcOffsetForDate(tomorrowMidnightIL);
  return tomorrowMidnightIL.getTime() - offsetMs - 1;
}

/**
 * מציג תאריך+שעה לפי Israel timezone (לתצוגה בלבד).
 */
export function formatIsraeliDateTime(utcDateStr) {
  if (!utcDateStr) return null;
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: TZ,
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(utcDateStr));
  } catch {
    return null;
  }
}

/**
 * מציג תאריך + שעה קצר (ללא שנה) לפי Israel timezone.
 */
export function formatIsraeliDateTimeShort(utcDateStr) {
  if (!utcDateStr) return null;
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: TZ,
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(utcDateStr));
  } catch {
    return null;
  }
}

/**
 * מחזיר טקסט "לפני X דקות/שעות/ימים" + ספירת דקות כוללת.
 * חישוב ב-UTC נטו — ללא תלות ב-timezone.
 */
export function getAgeParts(utcDateStr) {
  if (!utcDateStr) return null;
  const diffMs = Date.now() - new Date(utcDateStr).getTime();
  if (diffMs < 0) return { text: "עכשיו", minutes: 0 };
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return { text: `${days} ימים`, minutes: totalMinutes };
  if (hours > 0) return { text: `${hours} שע'`, minutes: totalMinutes };
  return { text: `${totalMinutes} דק'`, minutes: totalMinutes };
}

/**
 * חישוב priority של ליד — לוגיקה מרכזית אחת לכל המערכת.
 */
export function computeLeadPriority(client) {
  const lifecycle = client.lifecycle || "open";
  if (lifecycle !== "open") return client.priority || "warm";
  if (!client.first_response_at && isSlaBreached(client.created_date, SLA_MINUTES)) return "overdue";
  if (client.next_followup_at && isPast(client.next_followup_at)) return "overdue";
  return client.priority || "warm";
}

/**
 * טקסט "לפני X" קצר לתצוגה ב-lists
 */
export function formatAgeText(utcDateStr) {
  const parts = getAgeParts(utcDateStr);
  if (!parts) return "";
  if (parts.minutes === 0) return "עכשיו";
  return `לפני ${parts.text}`;
}

/**
 * Debug info — להצגת מידע אבחוני על ליד (לסביבת פיתוח בלבד)
 */
export function getLeadDebugInfo(client) {
  const createdAt = client.created_date || client.submission_date;
  const nowMs = Date.now();
  const createdMs = createdAt ? new Date(createdAt).getTime() : null;
  const diffMinutes = createdMs ? (nowMs - createdMs) / 60000 : null;
  const slaBreached = createdAt ? isSlaBreached(createdAt) : false;
  return {
    created_at_raw: createdAt,
    created_at_ms: createdMs,
    now_ms: nowMs,
    diff_minutes: diffMinutes ? Math.round(diffMinutes * 10) / 10 : null,
    computed_priority: computeLeadPriority(client),
    isSlaBreached: slaBreached,
    israel_display: createdAt ? formatIsraeliDateTime(createdAt) : null,
  };
}