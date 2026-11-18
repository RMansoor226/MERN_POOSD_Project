// Degree audit: how a student's enrollments line up with a program's requirements.
// Mirrors the backend's grade rules (api/utils/enrollmentRules.js).

import { matchesFilter } from './format.js';

const POINTS = {
  A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, 'D-': 0.7, F: 0,
};
export const isPassing = (grade) => (POINTS[grade] ?? 0) > 0;

// "COP3502L" -> { subject: 'COP', number: '3502L' } (enrollments only carry the course code)
export function splitCode(code = '') {
  const m = String(code).match(/^([A-Za-z]+)(.*)$/);
  return m ? { subject: m[1].toUpperCase(), number: m[2] } : { subject: '', number: String(code) };
}

/*
 * enrollments: the student's records (courseId populated with code/credits)
 * courseInfo:  { [courseId]: { attributes } } for attribute filters (optional)
 * Returns one entry per requirement:
 *   { name, rule, target, done, inProgress, complete, unit, counted: [codes] }
 * plus earnedCredits for the whole record.
 */
export function auditProgram(program, enrollments, courseInfo = {}) {
  const passed = new Map(); // courseId -> course (latest passing attempt)
  const taking = new Map(); // courseId -> course (enrolled now)
  for (const e of enrollments) {
    const course = e.courseId;
    if (!course?._id) continue;
    if (e.status === 'completed' && isPassing(e.grade)) passed.set(String(course._id), course);
    if (e.status === 'enrolled') taking.set(String(course._id), course);
  }

  const qualifies = (req, id, course) => {
    if ((req.courseIds ?? []).map(String).includes(id)) return true;
    const f = req.filter;
    if (!f || !(f.subject || f.minLevel || f.attribute)) return false;
    return matchesFilter({ ...splitCode(course.code), code: course.code, attributes: courseInfo[id]?.attributes ?? [] }, f);
  };

  const requirements = (program.requirements ?? []).map((req) => {
    const done = [...passed].filter(([id, c]) => qualifies(req, id, c)).map(([, c]) => c);
    const now = [...taking].filter(([id, c]) => !passed.has(id) && qualifies(req, id, c)).map(([, c]) => c);
    const credits = (list) => list.reduce((sum, c) => sum + (c.credits ?? 0), 0);

    let target;
    let have;
    let doing;
    let unit = 'courses';
    if (req.rule === 'all') {
      const ids = (req.courseIds ?? []).map(String);
      target = ids.length;
      have = ids.filter((id) => passed.has(id)).length;
      doing = ids.filter((id) => !passed.has(id) && taking.has(id)).length;
    } else if (req.rule === 'anyN') {
      target = req.n;
      have = Math.min(done.length, target);
      doing = now.length;
    } else {
      unit = 'credits';
      target = req.credits;
      have = Math.min(credits(done), target);
      doing = credits(now);
    }
    return {
      name: req.name,
      rule: req.rule,
      target,
      done: have,
      inProgress: doing,
      complete: have >= target,
      unit,
      counted: done.map((c) => c.code),
    };
  });

  const earnedCredits = [...passed.values()].reduce((sum, c) => sum + (c.credits ?? 0), 0);
  return { requirements, earnedCredits, completeCount: requirements.filter((r) => r.complete).length };
}
