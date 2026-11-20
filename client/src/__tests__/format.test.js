import { describe, expect, it } from 'vitest';
import {
  cleanParams,
  courseLevel,
  describeFilter,
  describeRule,
  matchesFilter,
  registrationStatus,
  defaultTermId,
  formatLocation,
  formatMeetingTime,
  formatMinute,
  normalizeCode,
  seatInfo,
} from '../format.js';

describe('formatMinute', () => {
  it('turns minutes from midnight into 12-hour times', () => {
    expect(formatMinute(0)).toBe('12:00 AM');
    expect(formatMinute(570)).toBe('9:30 AM');
    expect(formatMinute(720)).toBe('12:00 PM');
    expect(formatMinute(885)).toBe('2:45 PM');
  });
});

describe('meeting display', () => {
  it('formats days, times and location', () => {
    const m = { days: ['M', 'W'], startMinute: 630, endMinute: 705, building: 'HEC', room: '101' };
    expect(formatMeetingTime(m)).toBe('MW 10:30 AM – 11:45 AM');
    expect(formatLocation(m)).toBe('HEC 101');
    expect(formatLocation({})).toBe('TBA');
  });
});

describe('seatInfo', () => {
  const base = { capacity: 40, enrolledCount: 10, waitlistCapacity: 5, waitlistCount: 0, status: 'open' };

  it('labels open, waitlist, full, closed and cancelled sections', () => {
    expect(seatInfo(base)).toMatchObject({ open: 30, label: 'Open' });
    expect(seatInfo({ ...base, enrolledCount: 40, waitlistCount: 2 }).label).toBe('Waitlist');
    expect(seatInfo({ ...base, enrolledCount: 40, waitlistCount: 5 }).label).toBe('Full');
    expect(seatInfo({ ...base, enrolledCount: 40, waitlistCapacity: 0 }).label).toBe('Full');
    expect(seatInfo({ ...base, status: 'closed' }).label).toBe('Closed');
    expect(seatInfo({ ...base, status: 'cancelled' }).label).toBe('Cancelled');
  });

  it('never reports negative open seats', () => {
    expect(seatInfo({ ...base, enrolledCount: 45 }).open).toBe(0);
  });
});

describe('defaultTermId', () => {
  const now = new Date('2026-11-17');
  const spring26 = {
    _id: 's26',
    startDate: '2026-01-12',
    registrationOpens: '2025-11-03',
    registrationCloses: '2026-01-23',
  };
  const spring27 = {
    _id: 's27',
    startDate: '2027-01-11',
    registrationOpens: '2026-11-02',
    registrationCloses: '2027-01-22',
  };
  const fall27 = {
    _id: 'f27',
    startDate: '2027-08-23',
    registrationOpens: '2027-04-01',
    registrationCloses: '2027-08-30',
  };

  it('prefers the term whose registration is open', () => {
    expect(defaultTermId([fall27, spring27, spring26], now)).toBe('s27');
  });

  it('otherwise picks the next term to start', () => {
    expect(defaultTermId([fall27, spring26], now)).toBe('f27');
  });

  it('otherwise picks the most recent term', () => {
    expect(defaultTermId([spring26], now)).toBe('s26');
    expect(defaultTermId([], now)).toBe('');
  });
});

describe('small helpers', () => {
  it('normalizes course codes', () => {
    expect(normalizeCode(' cop 4331 ')).toBe('COP4331');
  });

  it('drops empty URL params and the default page', () => {
    expect(cleanParams({ q: 'cop', department: '', page: 1 })).toEqual({ q: 'cop' });
    expect(cleanParams({ q: '', page: 3 })).toEqual({ page: '3' });
  });
});

describe('registrationStatus', () => {
  const term = { registrationOpens: '2026-11-02T00:00:00Z', registrationCloses: '2027-01-22T00:00:00Z' };

  it('reports upcoming, open and closed windows with days to the next boundary', () => {
    expect(registrationStatus(term, new Date('2026-10-31T00:00:00Z'))).toEqual({ state: 'upcoming', days: 2 });
    expect(registrationStatus(term, new Date('2027-01-20T12:00:00Z'))).toEqual({ state: 'open', days: 2 });
    expect(registrationStatus(term, new Date('2027-01-22T00:00:00Z'))).toEqual({ state: 'open', days: 0 });
    expect(registrationStatus(term, new Date('2027-02-01T00:00:00Z'))).toEqual({ state: 'closed', days: 0 });
  });
});

describe('program requirement helpers', () => {
  it('describes each rule', () => {
    expect(describeRule({ rule: 'all' })).toBe('Complete all of these courses');
    expect(describeRule({ rule: 'anyN', n: 1 })).toBe('Choose 1 course');
    expect(describeRule({ rule: 'anyN', n: 2 })).toBe('Choose 2 courses');
    expect(describeRule({ rule: 'minCredits', credits: 7 })).toBe('Earn at least 7 credits');
  });

  it('describes filters', () => {
    expect(describeFilter({ subject: 'cop', minLevel: 4000 })).toBe('any COP course at the 4000 level or above');
    expect(describeFilter({ attribute: 'Writing Intensive' })).toBe('any course with the Writing Intensive attribute');
  });

  it('matches courses by subject, level and attribute', () => {
    const c = { subject: 'COP', number: '4331', code: 'COP4331', attributes: ['Writing Intensive'] };
    expect(courseLevel({ number: '3502L' })).toBe(3502);
    expect(courseLevel({ code: 'MAC2311' })).toBe(2311);
    expect(matchesFilter(c, { subject: 'cop', minLevel: 4000 })).toBe(true);
    expect(matchesFilter(c, { minLevel: 5000 })).toBe(false);
    expect(matchesFilter(c, { subject: 'MAC' })).toBe(false);
    expect(matchesFilter(c, { attribute: 'Writing Intensive' })).toBe(true);
    expect(matchesFilter(c, { attribute: 'GenEd-Math' })).toBe(false);
  });
});
