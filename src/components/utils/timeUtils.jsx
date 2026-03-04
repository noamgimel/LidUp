/**
 * timeUtils.js — סטנדרט זמנים אחיד לכל המערכת
 *
 * כלל יסוד:
 *   - ה-DB שומר UTC בלבד
 *   - כל חישובי SLA/diff עובדים על epoch ms בלבד: Date.now() / .getTime()
 *   - תצוגה למשתמש: Intl.DateTimeFormat עם timeZone:'Asia/Jerusalem' בלבד
 *
 * ❌ NEVER: new Date(str.toLocaleString("en-US", {timeZone})) — גורם ל-double-offset bug!
 * ❌ NEVER: getTime() אחרי toLocaleString → new Date()
 * ❌ NEVER: הנחה שה-browser timezone = ישראל
 */

export const TZ = "Asia/Jerusalem";
export const SLA_MINUTES = 30;

/**
 * פונקציה פנימית: קריאת שדות ישראל לתאריך נתון מ-Intl (DST-safe).
 * מחזיר { year, month, day, hour, minute, second } בזמן ישראל.
 */
function _getIsraelParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const get = (type) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);
  let h = get("hour");
  if (h === 24) h = 0; // midnight edge case in some locales

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: h,
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * המרת "YYYY-MM-DDTHH:mm" (זמן ישראל) → UTC ISO string.
 *
 * אלגוריתם DST-safe:
 *   ניגש ל-Intl עם TZ כדי לדעת מה שעת ישראל עבור כל timestamp UTC.
 *   עושים binary-search (iteration) עד שמוצאים UTC שכאשר מוחלים
 *   ה-TZ עליו, מקבלים בדיוק את ה-localStr שביקשנו.
 *   זו הדרך היחידה שמובטחת נכונה כולל DST ו-edge cases.
 *
 * @param {string} localStr - "2025-06-10T09:00" (זמן ישראל)
 * @returns {string} UTC ISO string
 */
export function israelLocalToUtcIso(localStr) {
  if (!localStr) return null;

  // Parse the input as if it's a naive datetime (ignore any TZ in string)
  const clean = localStr.length === 16 ? localStr + ":00" : localStr.slice(0, 19);
  const [datePart, timePart] = clean.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  // Start with an approximation: assume UTC+2 (Israel winter) as initial guess
  // We'll refine in a few iterations
  let guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second || 0) - 2 * 3600000;

  // Iterate 3 times — enough to converge on any DST boundary
  for (let i = 0; i < 3; i++) {
    const guessDate = new Date(guessUtcMs);
    const il = _getIsraelParts(guessDate);
    // Compute what the Israel local time IS for this UTC guess (as epoch ms)
    const ilEpoch = Date.UTC(il.year, il.month - 1, il.day, il.hour, il.minute, il.second);
    // Compute what the target local time is (as epoch ms, treating it as UTC for arithmetic)
    const targetEpoch = Date.UTC(year, month - 1, day, hour, minute, second || 0);
    // The difference is the correction: move guessUtcMs by the error
    const error = ilEpoch - targetEpoch;
    guessUtcMs -= error;
  }

  return new Date(guessUtcMs).toISOString();
}

/**
 * מחשב הפרש בדקות בין utcDateStr לעכשיו (UTC-only, DST-safe).
 * ✅ SAFE: מבוסס על epoch ms בלבד — ללא המרות TZ.
 */
export function minutesSince(utcDateStr) {
  if (!utcDateStr) return 0;
  return (Date.now() - new Date(utcDateStr).getTime()) / 60000;
}

/**
 * בדיקת SLA: האם עברו יותר מ-threshold דקות?
 * ✅ SAFE: epoch ms בלבד.
 */
export function isSlaBreached(utcDateStr, thresholdMinutes = SLA_MINUTES) {
  return minutesSince(utcDateStr) >= thresholdMinutes;
}

/**
 * בדיקה: האם utcDateStr כבר עבר?
 * ✅ SAFE: epoch ms בלבד.
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
 * ✅ SAFE: משתמש ב-israelLocalToUtcIso.
 */
export function endOfTodayUtcMs() {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  // end of today = tomorrow midnight Israel - 1ms
  const tomorrowMidnightUtcIso = israelLocalToUtcIso(todayStr + "T00:00:00");
  // advance by 1 day
  return new Date(tomorrowMidnightUtcIso).getTime() + 86400000 - 1;
}

/**
 * מציג תאריך+שעה לפי Israel timezone (לתצוגה בלבד).
 * ✅ SAFE: Intl display only, no re-parsing.
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
 * ✅ SAFE: Intl display only.
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
 * ✅ SAFE: חישוב ב-UTC נטו — ללא תלות ב-timezone.
 */
/**
 * גרסה המקבלת client object ישירות — משתמשת ב-getLeadReceivedAt.
 */
export function getLeadAgeParts(client) {
  return getAgeParts(getLeadReceivedAt(client));
}

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
 * מקור אמת אחיד לזמן קליטת הליד.
 * בודק את כל שמות השדה האפשריים ב-Base44 (created_date, created_at, createdAt).
 * ✅ תמיד מעדיף שדה שנוצר ע"י השרת — ללא תלות בשעון הדפדפן.
 */
export function getLeadReceivedAt(client) {
  // Base44 יכול להשתמש בכל אחד מהשמות האלה — נבדוק את כולם
  const raw = client.created_date || client.created_at || client.createdAt || client.submission_date || null;
  if (!raw) return null;
  // וודא שמסתיים ב-Z (UTC) — אם לא, הוסף כדי שלא יפורש כ-local
  const str = String(raw);
  if (str.endsWith('Z') || str.includes('+') || str.includes('-', 10)) return str;
  return str + 'Z';
}

/**
 * חישוב priority של ליד — לוגיקה מרכזית אחת לכל המערכת.
 * ✅ SAFE: מבוסס על isSlaBreached ו-isPast שעובדים על epoch ms.
 */
export function computeLeadPriority(client) {
  const lifecycle = client.lifecycle || "open";
  if (lifecycle !== "open") return client.priority || "warm";
  const receivedAt = getLeadReceivedAt(client);
  if (!client.first_response_at && isSlaBreached(receivedAt, SLA_MINUTES)) return "overdue";
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

  // Verify israelLocalToUtcIso round-trip
  let roundTripTest = null;
  try {
    const israelDisplayStr = createdAt
      ? new Intl.DateTimeFormat("en-US", {
          timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hour12: false
        }).formatToParts(new Date(createdAt))
          .reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {})
      : null;
    if (israelDisplayStr) {
      const { year, month, day, hour, minute } = israelDisplayStr;
      const localStr = `${year}-${month}-${day}T${hour === "24" ? "00" : hour}:${minute}`;
      const backToUtc = israelLocalToUtcIso(localStr);
      const backMs = new Date(backToUtc).getTime();
      roundTripTest = {
        israel_local: localStr,
        back_to_utc: backToUtc,
        error_seconds: Math.round((backMs - new Date(createdAt).getTime()) / 1000)
      };
    }
  } catch (e) {
    roundTripTest = { error: e.message };
  }

  return {
    created_at_raw: createdAt,
    created_at_ms: createdMs,
    now_ms: nowMs,
    diff_minutes: diffMinutes ? Math.round(diffMinutes * 10) / 10 : null,
    computed_priority: computeLeadPriority(client),
    isSlaBreached: slaBreached,
    israel_display: createdAt ? formatIsraeliDateTime(createdAt) : null,
    roundTripTest,
  };
}