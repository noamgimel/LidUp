/**
 * timeUtils.js — סטנדרט זמנים אחיד לכל המערכת
 *
 * כלל יסוד:
 *   - ה-DB שומר UTC בלבד
 *   - כל חישובי SLA/diff עובדים על UTC timestamps ישירות (Date.now() / getTime())
 *   - תצוגה למשתמש: המרה ל-Asia/Jerusalem בלבד
 *
 * NEVER: new Date(str.toLocaleString("en-US", {timeZone})) — גורם ל-double-offset bug!
 */

export const TZ = "Asia/Jerusalem";
export const SLA_MINUTES = 30;

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
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  // בנה 23:59:59 ישראל: מצא offset ישראל נוכחי
  const offsetMs = getIsraelUtcOffsetMs();
  // UTC midnight של יום זה לפי ישראל = midnight Israel - offset
  const midnightIsraelUtcMs = new Date(todayStr + "T00:00:00Z").getTime() - offsetMs;
  return midnightIsraelUtcMs + 24 * 60 * 60 * 1000 - 1;
}

/**
 * מחזיר את ה-UTC offset של Israel timezone במילישניות (DST-safe).
 */
export function getIsraelUtcOffsetMs() {
  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: TZ });
  const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  return new Date(localStr).getTime() - new Date(utcStr).getTime();
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