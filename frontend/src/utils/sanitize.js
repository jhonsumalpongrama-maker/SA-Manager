import { MAX_NAME_LENGTH } from '../config/constants';

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const DANGEROUS_CHARS = /[<>{}\\`]/g;

/** Trims, collapses whitespace, strips control/markup characters and fixes ALL-CAPS / all-lower names. */
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFC').replace(CONTROL_CHARS, ' ').replace(DANGEROUS_CHARS, '');
  s = s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH).trim();
  if (s && (s === s.toLowerCase() || s === s.toUpperCase())) {
    s = s.toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
  }
  return s;
}

/** Like sanitizeName but keeps the casing as typed (area names such as "CISO" must not be re-cased). */
export function sanitizeLabel(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .normalize('NFC')
    .replace(CONTROL_CHARS, ' ')
    .replace(DANGEROUS_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

export function nameKey(name) {
  return sanitizeName(name).toLowerCase();
}

/**
 * Deterministic Firestore document id for a student, derived from the normalised name. Two admins
 * adding the same new student at the same moment therefore write the same document instead of
 * creating duplicates.
 */
export function studentIdFor(name) {
  return `s_${encodeURIComponent(nameKey(name)).replace(/%/g, '~')}`;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Free-text (notes etc.): strip control chars and angle brackets, collapse whitespace, cap length. */
export function sanitizeText(raw, max = 200) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_CHARS, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Validates the "Add New Student" form.
 * `existingAssignments` are the assignments of the selected week.
 */
export function validateNewStudent({ name, scheduleType, existingAssignments = [], validSchedules }) {
  const clean = sanitizeName(name);
  if (!clean) return { ok: false, error: 'Full name is required.' };
  if (!/[\p{L}\p{N}]/u.test(clean)) return { ok: false, error: 'Please enter a valid name.' };
  if (!scheduleType || (validSchedules && !validSchedules.includes(scheduleType))) {
    return { ok: false, error: 'Please select a schedule.' };
  }
  const key = clean.toLowerCase();
  const dup = existingAssignments.some(
    (a) => a.scheduleType === scheduleType && (a.studentName || '').toLowerCase() === key,
  );
  if (dup) return { ok: false, error: `${clean} is already assigned in this schedule for this week.` };
  return { ok: true, name: clean, nameLower: key };
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
