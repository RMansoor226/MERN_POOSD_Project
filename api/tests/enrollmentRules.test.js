// Unit tests for the pure registration rules. Run with: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    meetsGrade, prereqsMet, describePrereqs, prereqCourseIds, meetingsOverlap, findTimeConflict, registrationOpen, formatMeetings
} = require('../utils/enrollmentRules');

const T1 = 'term1';
const T2 = 'term2';
const done = (courseId, grade, termId = T1) => ({ courseId, status: 'completed', grade, termId });
const taking = (courseId, termId = T2, status = 'enrolled') => ({ courseId, status, termId });

test('meetsGrade compares grade points, with plus/minus', () => {
    assert.equal(meetsGrade('B', 'C'), true);
    assert.equal(meetsGrade('C', 'C'), true);
    assert.equal(meetsGrade('C-', 'C'), false);
    assert.equal(meetsGrade('C+', 'C'), true);
    assert.equal(meetsGrade('D-'), true, 'any passing grade with no minimum');
    assert.equal(meetsGrade('F'), false);
    assert.equal(meetsGrade('W'), false, 'unknown grades never count');
    assert.equal(meetsGrade(undefined, 'D'), false);
});

test('prereqsMet: no tree means no requirement', () => {
    assert.equal(prereqsMet(null, [], T2), true);
});

test('prereqsMet: a leaf needs a completed course with a good enough grade', () => {
    const leaf = { courseId: 'c1', minGrade: 'C' };
    assert.equal(prereqsMet(leaf, [done('c1', 'B')], T2), true);
    assert.equal(prereqsMet(leaf, [done('c1', 'D')], T2), false);
    assert.equal(prereqsMet(leaf, [done('c2', 'A')], T2), false);
    assert.equal(prereqsMet(leaf, [taking('c1')], T2), false, 'in progress does not count without concurrentOk');
    assert.equal(prereqsMet(leaf, [{ courseId: 'c1', status: 'dropped', termId: T1 }], T2), false);
});

test('prereqsMet: concurrentOk accepts the course in progress in the same term only', () => {
    const leaf = { courseId: 'c1', concurrentOk: true };
    assert.equal(prereqsMet(leaf, [taking('c1', T2)], T2), true);
    assert.equal(prereqsMet(leaf, [taking('c1', T2, 'waitlisted')], T2), true);
    assert.equal(prereqsMet(leaf, [taking('c1', T1)], T2), false, 'other term');
});

test('prereqsMet: AND / OR groups, nested', () => {
    const tree = {
        op: 'AND',
        items: [
            { courseId: 'c3503', minGrade: 'C' },
            { op: 'OR', items: [{ courseId: 'c2311', concurrentOk: true }, { courseId: 'c3502' }] }
        ]
    };
    assert.equal(prereqsMet(tree, [done('c3503', 'B'), done('c3502', 'C')], T2), true);
    assert.equal(prereqsMet(tree, [done('c3503', 'B'), taking('c2311')], T2), true);
    assert.equal(prereqsMet(tree, [done('c3503', 'B')], T2), false, 'OR branch unmet');
    assert.equal(prereqsMet(tree, [done('c3502', 'A'), done('c2311', 'A')], T2), false, 'AND branch unmet');
});

test('describePrereqs and prereqCourseIds', () => {
    const tree = {
        op: 'AND',
        items: [
            { courseId: 'a', minGrade: 'C' },
            { op: 'OR', items: [{ courseId: 'b', concurrentOk: true }, { courseId: 'c' }] }
        ]
    };
    const codes = { a: 'COP3503', b: 'MAC2311', c: 'COP3502' };
    assert.equal(
        describePrereqs(tree, codes),
        'COP3503 (C or better) and (MAC2311 (may be taken concurrently) or COP3502)'
    );
    assert.deepEqual(prereqCourseIds(tree), ['a', 'b', 'c']);
    assert.equal(describePrereqs({ courseId: 'zzz' }, codes), 'an unknown course');
});

test('meetingsOverlap needs a shared day and overlapping times; back-to-back is fine', () => {
    const mw1030 = { days: ['M', 'W'], startMinute: 630, endMinute: 705 };
    assert.equal(meetingsOverlap(mw1030, { days: ['W'], startMinute: 700, endMinute: 760 }), true);
    assert.equal(meetingsOverlap(mw1030, { days: ['T', 'R'], startMinute: 630, endMinute: 705 }), false);
    assert.equal(meetingsOverlap(mw1030, { days: ['M'], startMinute: 705, endMinute: 755 }), false);
    assert.equal(meetingsOverlap(mw1030, { days: ['M'], startMinute: 540, endMinute: 630 }), false);
});

test('findTimeConflict returns the clashing section and ignores the section itself', () => {
    const section = { _id: 's1', meetings: [{ days: ['M', 'W'], startMinute: 630, endMinute: 705 }] };
    const others = [
        { _id: 's2', meetings: [{ days: ['T'], startMinute: 630, endMinute: 705 }] },
        { _id: 's3', meetings: [{ days: ['W'], startMinute: 660, endMinute: 720 }] }
    ];
    assert.equal(findTimeConflict(section, others)._id, 's3');
    assert.equal(findTimeConflict(section, [section]), null);
    assert.equal(findTimeConflict({ _id: 'online', meetings: [] }, others), null);
});

test('registrationOpen covers the window inclusively', () => {
    const term = { registrationOpens: '2026-11-02T00:00:00Z', registrationCloses: '2027-01-22T00:00:00Z' };
    assert.equal(registrationOpen(term, new Date('2026-11-01T23:59:59Z')), false);
    assert.equal(registrationOpen(term, new Date('2026-11-02T00:00:00Z')), true);
    assert.equal(registrationOpen(term, new Date('2027-01-22T00:00:00Z')), true);
    assert.equal(registrationOpen(term, new Date('2027-01-22T00:00:01Z')), false);
});

test('formatMeetings', () => {
    assert.equal(formatMeetings([{ days: ['M', 'W'], startMinute: 630, endMinute: 705 }]), 'MW 10:30–11:45');
});
