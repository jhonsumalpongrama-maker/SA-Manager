/**
 * Date helpers that work on "yyyy-MM-dd" keys using UTC arithmetic only, so results never depend
 * on the machine's timezone. The configured app timezone is applied exactly once, when converting
 * a real instant ("now") into a key.
 */

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateKey(key) {
  if (typeof key !== 'string') return false;
  const m = KEY_RE.exec(key);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function keyToUtc(key) {
  if (!isValidDateKey(key)) throw new Error(`Invalid date key: ${key}`);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date) {
  return date.toISOString().slice(0, 10);
}

/** Converts an instant to the calendar date it falls on in the given IANA timezone. */
export function dateKeyInTz(date = new Date(), timeZone = 'Asia/Manila') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function todayKey(timeZone = 'Asia/Manila', now = new Date()) {
  return dateKeyInTz(now, timeZone);
}

export function addDays(key, n) {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return utcToKey(d);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(key) {
  return keyToUtc(key).getUTCDay();
}

/** The first day of the week containing `key`. This is the weekId. */
export function weekIdFor(key, weekStartsOn = 0) {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function previousWeekId(weekId) {
  return addDays(weekId, -7);
}

export function nextWeekId(weekId) {
  return addDays(weekId, 7);
}

export function weekDays(weekId) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekId, i));
}

/** Compare two keys; lexical order equals chronological order for yyyy-MM-dd. */
export function compareKeys(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Builds the visible month grid (always full weeks).
 * Returns an array of weeks; each week is an array of { key, inMonth }.
 */
export function monthGrid(year, monthIndex, weekStartsOn = 0) {
  const first = utcToKey(new Date(Date.UTC(year, monthIndex, 1)));
  const gridStart = weekIdFor(first, weekStartsOn);
  const weeks = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w += 1) {
    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const key = addDays(cursor, i);
      days.push({ key, inMonth: Number(key.slice(5, 7)) - 1 === monthIndex });
    }
    weeks.push(days);
    cursor = addDays(cursor, 7);
    if (w >= 3 && Number(cursor.slice(5, 7)) - 1 !== monthIndex && cursor.slice(0, 7) > first.slice(0, 7)) {
      // stop once the next row would be entirely outside the month
      break;
    }
  }
  return weeks;
}

export function shiftMonth(year, monthIndex, delta) {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}
