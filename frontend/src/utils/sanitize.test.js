import { describe, it, expect } from 'vitest';
import { sanitizeLabel, sanitizeName, sanitizeText, slugify, studentIdFor, validateNewStudent } from './sanitize';

describe('ids', () => {
  it('derives the same student id for any casing / spacing of a name', () => {
    expect(studentIdFor('  ann   LEE ')).toBe(studentIdFor('Ann Lee'));
    expect(studentIdFor('Ann Lee')).not.toBe(studentIdFor('Ann Leigh'));
  });
  it('produces ids that are safe as Firestore document ids', () => {
    const id = studentIdFor('Ann/Lee . Ñandú');
    expect(id.includes('/')).toBe(false);
    expect(id.startsWith('s_')).toBe(true);
  });
  it('slugifies area names', () => {
    expect(slugify('Faculty Lounge - 1st Floor')).toBe('faculty-lounge-1st-floor');
  });
});

describe('sanitizeName', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeName('   Juan   Dela   Cruz  ')).toBe('Juan Dela Cruz');
  });
  it('strips markup characters', () => {
    expect(sanitizeName('<script>alert(1)</script>Ann')).toBe('scriptalert(1)/scriptAnn');
    expect(sanitizeName('Ann <b>')).toBe('Ann b');
  });
  it('fixes all-lowercase and ALL-CAPS names but keeps mixed case', () => {
    expect(sanitizeName('maria clara')).toBe('Maria Clara');
    expect(sanitizeName('JOSE RIZAL')).toBe('Jose Rizal');
    expect(sanitizeName("o'neil-smith")).toBe("O'Neil-Smith");
    expect(sanitizeName('Ana de la Cruz')).toBe('Ana de la Cruz');
    expect(sanitizeName('McDonald')).toBe('McDonald');
  });
  it('limits length and handles non-strings', () => {
    expect(sanitizeName('x'.repeat(200)).length).toBeLessThanOrEqual(60);
    expect(sanitizeName(null)).toBe('');
    expect(sanitizeName(42)).toBe('');
  });
});

describe('sanitizeText', () => {
  it('removes angle brackets and caps length', () => {
    expect(sanitizeText('late <b>bus</b>', 10)).toBe('late bbus/');
  });
});

describe('validateNewStudent', () => {
  const existing = [{ studentName: 'Ann Lee', scheduleType: 'MWF' }];
  it('requires a name', () => {
    expect(validateNewStudent({ name: '   ', scheduleType: 'MWF' }).ok).toBe(false);
  });
  it('rejects names with no letters or digits', () => {
    expect(validateNewStudent({ name: '...', scheduleType: 'MWF' }).ok).toBe(false);
  });
  it('requires a schedule', () => {
    expect(validateNewStudent({ name: 'Bo', scheduleType: '' }).ok).toBe(false);
  });
  it('rejects case-insensitive duplicates in the same schedule', () => {
    const r = validateNewStudent({ name: ' ann   LEE ', scheduleType: 'MWF', existingAssignments: existing });
    expect(r.ok).toBe(false);
  });
  it('allows the same name in another schedule', () => {
    const r = validateNewStudent({ name: 'Ann Lee', scheduleType: 'EVERYDAY', existingAssignments: existing });
    expect(r.ok).toBe(true);
    expect(r.nameLower).toBe('ann lee');
  });
});

describe('sanitizeLabel', () => {
  it('keeps casing for area names', () => {
    expect(sanitizeLabel('  CISO ')).toBe('CISO');
    expect(sanitizeLabel('TA Bldg - 1st Floor')).toBe('TA Bldg - 1st Floor');
  });
});
