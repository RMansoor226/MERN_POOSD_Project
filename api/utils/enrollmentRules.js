// Pure registration rules: grades, prerequisite trees, meeting-time conflicts and the
// registration window. No database access here, so these are unit-tested directly
// (api/tests/enrollmentRules.test.js).

const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
const POINTS = {
    'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3,
    'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0
};

// "C or better" means the grade is worth at least as much as C. With no minimum, any
// passing grade (D- and up) counts. Unknown grades never satisfy a requirement.
function meetsGrade(grade, minGrade) {
    const earned = POINTS[grade];
    if (earned === undefined) return false;
    return minGrade ? earned >= POINTS[minGrade] : earned > 0;
}

/*
 * history: the student's enrollments as [{ courseId, status, grade, termId }]
 * termId:  the term being registered for (concurrent prereqs must be in this term)
 *
 * A leaf { courseId, minGrade?, concurrentOk? } is satisfied by
 *   - a completed enrollment (registered, transfer or AP) for that course with a good
 *     enough grade, or
 *   - when concurrentOk, an enrolled/waitlisted enrollment for it in the same term.
 * Groups use AND / OR over their items. null / undefined means "no prerequisites".
 */
function prereqsMet(node, history, termId) {
    if (!node) return true;
    if (node.courseId !== undefined) {
        const id = String(node.courseId);
        return history.some((e) => {
            if (String(e.courseId) !== id) return false;
            if (e.status === 'completed') return meetsGrade(e.grade, node.minGrade);
            return Boolean(node.concurrentOk)
                && (e.status === 'enrolled' || e.status === 'waitlisted')
                && String(e.termId) === String(termId);
        });
    }
    const results = (node.items ?? []).map((n) => prereqsMet(n, history, termId));
    return node.op === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

// "COP3503 (C or better) and (MAC2311 or COP3502)" for error messages.
// codes: { [courseId]: 'COP3503' }
function describePrereqs(node, codes, nested = false) {
    if (!node) return '';
    if (node.courseId !== undefined) {
        const notes = [];
        if (node.minGrade) notes.push(`${node.minGrade} or better`);
        if (node.concurrentOk) notes.push('may be taken concurrently');
        const code = codes[String(node.courseId)] ?? 'an unknown course';
        return notes.length ? `${code} (${notes.join(', ')})` : code;
    }
    const joiner = node.op === 'OR' ? ' or ' : ' and ';
    const text = node.items.map((n) => describePrereqs(n, codes, true)).join(joiner);
    return nested && node.items.length > 1 ? `(${text})` : text;
}

// Every course id a prerequisite tree mentions (for looking up codes).
function prereqCourseIds(node, out = []) {
    if (!node) return out;
    if (node.courseId !== undefined) out.push(String(node.courseId));
    (node.items ?? []).forEach((n) => prereqCourseIds(n, out));
    return out;
}

// Two meetings clash when they share a day and their times overlap. Back-to-back
// meetings (one ends at 10:50, the next starts at 10:50) do not clash.
function meetingsOverlap(a, b) {
    const sharedDay = a.days.some((d) => b.days.includes(d));
    return sharedDay && a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

// The first section in `others` whose meetings clash with `section`, or null.
function findTimeConflict(section, others) {
    for (const other of others) {
        if (String(other._id) === String(section._id)) continue;
        for (const m of section.meetings ?? []) {
            if ((other.meetings ?? []).some((o) => meetingsOverlap(m, o))) return other;
        }
    }
    return null;
}

// Same rule the client shows: open from registrationOpens through registrationCloses.
function registrationOpen(term, now = new Date()) {
    return now >= new Date(term.registrationOpens) && now <= new Date(term.registrationCloses);
}

// "MW 10:30–11:45" for conflict messages
function formatMeetings(meetings = []) {
    const t = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    return meetings.map((m) => `${m.days.join('')} ${t(m.startMinute)}–${t(m.endMinute)}`).join(', ');
}

module.exports = {
    GRADES,
    meetsGrade,
    prereqsMet,
    describePrereqs,
    prereqCourseIds,
    meetingsOverlap,
    findTimeConflict,
    registrationOpen,
    formatMeetings
};
