import { describe, expect, it } from 'vitest';
import { auditProgram, isPassing, splitCode } from '../audit.js';

const c = (id, code, credits = 3) => ({ _id: id, code, credits });
const done = (course, grade) => ({ courseId: course, status: 'completed', grade });
const taking = (course) => ({ courseId: course, status: 'enrolled' });

const COP3502 = c('c1', 'COP3502');
const COP3503 = c('c2', 'COP3503');
const COP4331 = c('c3', 'COP4331');
const COP4600 = c('c4', 'COP4600');
const MAC2311 = c('c5', 'MAC2311', 4);

const PROGRAM = {
  requirements: [
    { name: 'Core', rule: 'all', courseIds: ['c1', 'c2', 'c3'] },
    { name: 'Electives', rule: 'anyN', n: 2, filter: { subject: 'COP', minLevel: 4000 } },
    { name: 'Math', rule: 'minCredits', credits: 7, courseIds: ['c5'] },
    { name: 'Writing', rule: 'anyN', n: 1, filter: { attribute: 'Writing Intensive' } },
  ],
};

describe('audit helpers', () => {
  it('splits codes and knows passing grades', () => {
    expect(splitCode('COP3502L')).toEqual({ subject: 'COP', number: '3502L' });
    expect(isPassing('D-')).toBe(true);
    expect(isPassing('F')).toBe(false);
    expect(isPassing(undefined)).toBe(false);
  });
});

describe('auditProgram', () => {
  it('counts each rule type and in-progress courses', () => {
    const result = auditProgram(
      PROGRAM,
      [done(COP3502, 'B'), done(COP3503, 'F'), taking(COP4331), done(COP4600, 'A'), done(MAC2311, 'C')],
      { c3: { attributes: ['Writing Intensive'] } }
    );
    const [core, electives, math, writing] = result.requirements;

    expect(core).toMatchObject({ target: 3, done: 1, inProgress: 1, complete: false, unit: 'courses' });
    // COP4600 counts; COP4331 is in progress; an F never counts
    expect(electives).toMatchObject({ target: 2, done: 1, inProgress: 1, complete: false, counted: ['COP4600'] });
    expect(math).toMatchObject({ target: 7, done: 4, complete: false, unit: 'credits' });
    expect(writing).toMatchObject({ done: 0, inProgress: 1 }); // COP4331 has the attribute
    expect(result.earnedCredits).toBe(3 + 3 + 4);
    expect(result.completeCount).toBe(0);
  });

  it('marks requirements complete and caps progress at the target', () => {
    const result = auditProgram(PROGRAM, [
      done(COP3502, 'A'),
      done(COP3503, 'A'),
      done(COP4331, 'B'),
      done(COP4600, 'B'),
      done(c('c6', 'COP4710'), 'C'),
      done(MAC2311, 'A'),
      done(c('c7', 'MAC2312', 4), 'A'),
    ]);
    const [core, electives, math] = result.requirements;
    expect(core.complete).toBe(true);
    expect(electives).toMatchObject({ done: 2, complete: true }); // 3 qualify, capped at 2
    expect(math).toMatchObject({ done: 4, complete: false }); // MAC2312 is not listed and math has no filter
  });

  it('ignores dropped and waitlisted records', () => {
    const result = auditProgram(PROGRAM, [
      { courseId: COP3502, status: 'dropped' },
      { courseId: COP3503, status: 'waitlisted' },
    ]);
    expect(result.requirements[0]).toMatchObject({ done: 0, inProgress: 0 });
  });
});
