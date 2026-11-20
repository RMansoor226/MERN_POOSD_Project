const { Enrollment, Section, Course, Term, User, Instructor } = require('../../models');
const AppError = require('../utils/AppError');
const {
    meetsGrade, prereqsMet, describePrereqs, prereqCourseIds, findTimeConflict, registrationOpen, formatMeetings
} = require('../utils/enrollmentRules');
const {
    claimSeat, claimWaitlistSlot, releaseSeat, releaseWaitlistSlot, fillFromWaitlist, waitlistPosition
} = require('../utils/seats');

/*
 * Who can do what
 *   student     list/read/register/drop their own enrollments
 *   instructor  read the rosters of sections they teach (Instructor.userId links the login)
 *               and complete enrollments with a grade
 *   advisor     read any student's enrollments (there is no advisee assignment yet)
 *   admin       everything, including registering or withdrawing any student; admin
 *               registrations skip the registration-window and prerequisite checks
 */

const ACTIVE = ['enrolled', 'waitlisted'];

const POPULATE = [
    {
        path: 'sectionId',
        select: 'sectionNumber crn meetings modality status capacity enrolledCount waitlistCapacity waitlistCount instructorIds',
        populate: { path: 'instructorIds', select: 'firstName lastName' }
    },
    { path: 'courseId', select: 'code title credits' },
    { path: 'termId', select: 'name startDate endDate registrationOpens registrationCloses' },
    { path: 'studentId', select: 'firstName lastName login email' }
];

const idOf = (v) => String(v?._id ?? v);

// Instructor record linked to this login, or null
const instructorFor = (userId) => Instructor.findOne({ userId });

async function teaches(userId, section) {
    const instructor = await instructorFor(userId);
    return Boolean(instructor && section.instructorIds.some((i) => idOf(i) === String(instructor._id)));
}

// Adds waitlistPosition to waitlisted enrollments (JSON output only)
async function present(enrollment) {
    const json = enrollment.toJSON();
    if (enrollment.status === 'waitlisted') json.waitlistPosition = await waitlistPosition(enrollment);
    return json;
}

// Can the caller see this enrollment?
async function assertCanRead(req, enrollment) {
    if (req.userRole === 'admin' || req.userRole === 'advisor') return;
    if (req.userRole === 'student' && idOf(enrollment.studentId) === req.userId) return;
    if (req.userRole === 'instructor') {
        const section = enrollment.sectionId?.instructorIds ? enrollment.sectionId : await Section.findById(idOf(enrollment.sectionId));
        if (section && (await teaches(req.userId, section))) return;
    }
    throw new AppError(403, 'You do not have access to this enrollment');
}

// GET /api/enrollments?studentId=&sectionId=&termId=&courseId=&status=&page=&limit=
//   students: always their own (studentId defaults to them; anyone else's is 403)
//   instructors: must pass a sectionId they teach (a class roster)
exports.listEnrollments = async (req, res) => {
    const { page, limit, studentId, sectionId, termId, courseId, status } = req.parsedQuery;
    const filter = {};

    if (req.userRole === 'student') {
        if (studentId && studentId !== req.userId) throw new AppError(403, 'Students can only view their own enrollments');
        filter.studentId = req.userId;
    } else if (req.userRole === 'instructor') {
        if (!sectionId) throw new AppError(403, 'Instructors can list enrollments for a section they teach (pass sectionId)');
        const section = await Section.findById(sectionId);
        if (!section) throw new AppError(404, 'Section not found with that ID');
        if (!(await teaches(req.userId, section))) throw new AppError(403, 'You do not teach this section');
    }

    if (studentId && !filter.studentId) filter.studentId = studentId;
    if (sectionId) filter.sectionId = sectionId;
    if (termId) filter.termId = termId;
    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
        Enrollment.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
        Enrollment.countDocuments(filter)
    ]);
    return res.status(200).json({ items: await Promise.all(items.map(present)), total, page, limit });
};

// GET /api/enrollments/:id
exports.getEnrollment = async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id).populate(POPULATE);
    if (!enrollment) throw new AppError(404, 'Enrollment not found with that ID');
    await assertCanRead(req, enrollment);
    return res.status(200).json(await present(enrollment));
};

// Every reason a student may not register for a section, checked before any seat is taken.
// Returns warnings that do not block (corequisites). Admins skip the window and prereqs.
async function checkEligibility({ student, section, term, course, isAdmin }) {
    if (section.status !== 'open') {
        throw new AppError(409, `This section is ${section.status} and not accepting registrations`);
    }
    if (!isAdmin && !registrationOpen(term)) {
        throw new AppError(409, `Registration for ${term.name} is not open`);
    }

    const history = await Enrollment.find({ studentId: student._id }).populate('sectionId', 'sectionNumber meetings');

    // one section of a course per term
    const sameCourse = history.find(
        (e) => ACTIVE.includes(e.status) && idOf(e.courseId) === String(course._id) && idOf(e.termId) === String(term._id)
    );
    if (sameCourse) {
        throw new AppError(409, `Already ${sameCourse.status} in ${course.code} section ${sameCourse.sectionId?.sectionNumber ?? ''} this term`.trim());
    }

    // no retaking a course already passed
    const passed = history.find((e) => e.status === 'completed' && idOf(e.courseId) === String(course._id) && meetsGrade(e.grade));
    if (passed) throw new AppError(409, `${course.code} was already completed with a ${passed.grade}`);

    if (!isAdmin && course.prereqs && !prereqsMet(course.prereqs, history, term._id)) {
        const ids = prereqCourseIds(course.prereqs);
        const courses = await Course.find({ _id: { $in: ids } }, 'code');
        const codes = Object.fromEntries(courses.map((c) => [String(c._id), c.code]));
        throw new AppError(409, 'Prerequisites not met', { prereqs: `Requires ${describePrereqs(course.prereqs, codes)}` });
    }

    // time conflicts with sections the student is enrolled in this term
    const enrolledThisTerm = history
        .filter((e) => e.status === 'enrolled' && idOf(e.termId) === String(term._id) && e.sectionId)
        .map((e) => ({ ...e.sectionId.toObject(), courseId: e.courseId }));
    const clash = findTimeConflict(section, enrolledThisTerm);
    if (clash) {
        const clashCourse = await Course.findById(clash.courseId, 'code');
        throw new AppError(409, `Time conflict with ${clashCourse?.code ?? 'another course'} section ${clash.sectionNumber} (${formatMeetings(clash.meetings)})`);
    }

    // corequisites don't block (two coreqs would otherwise lock each other out), but say so
    const warnings = [];
    if (course.coreqs?.length) {
        const coreqs = await Course.find({ _id: { $in: course.coreqs } }, 'code');
        for (const c of coreqs) {
            const has = history.some(
                (e) => idOf(e.courseId) === String(c._id)
                    && (e.status === 'completed' || (ACTIVE.includes(e.status) && idOf(e.termId) === String(term._id)))
            );
            if (!has) warnings.push(`${c.code} is a corequisite of ${course.code}; register for it this term too`);
        }
    }
    return warnings;
}

// POST /api/enrollments  { sectionId, studentId? }
// -> 201 enrollment (status 'enrolled' or 'waitlisted', plus waitlistPosition and warnings)
exports.createEnrollment = async (req, res) => {
    const isAdmin = req.userRole === 'admin';
    if (!isAdmin && req.userRole !== 'student') throw new AppError(403, 'Only students and admins can register for sections');

    const studentId = req.body.studentId ?? req.userId;
    if (!isAdmin && studentId !== req.userId) throw new AppError(403, 'Students can only register themselves');
    if (isAdmin && !req.body.studentId) throw new AppError(400, 'Validation Failed', { studentId: 'Admins must say which student to register' });

    const [student, section] = await Promise.all([User.findById(studentId), Section.findById(req.body.sectionId)]);
    if (!student) throw new AppError(404, 'Student not found with that ID');
    if (student.role !== 'student') throw new AppError(409, 'Only student accounts can be registered for sections');
    if (!section) throw new AppError(404, 'Section not found with that ID');
    const [term, course] = await Promise.all([Term.findById(section.termId), Course.findById(section.courseId)]);

    const warnings = await checkEligibility({ student, section, term, course, isAdmin });

    // seats freed some other way (e.g. a capacity increase) go to the waitlist first
    await fillFromWaitlist(section._id);

    let status;
    if (await claimSeat(section._id)) status = 'enrolled';
    else if (await claimWaitlistSlot(section._id)) status = 'waitlisted';
    else throw new AppError(409, 'This section and its waitlist are full');
    const release = () => (status === 'enrolled' ? releaseSeat(section._id) : releaseWaitlistSlot(section._id));

    const now = new Date();
    const stamp = status === 'enrolled' ? 'enrolledAt' : 'waitlistedAt';
    const otherStamp = status === 'enrolled' ? 'waitlistedAt' : 'enrolledAt';
    const fields = { status, courseId: section.courseId, termId: section.termId, source: 'registered', [stamp]: now };

    let enrollment;
    try {
        // a student who dropped this section before re-uses their old record (unique per
        // student+section); clear what belonged to the old attempt
        enrollment = await Enrollment.findOneAndUpdate(
            { studentId, sectionId: section._id, status: { $in: ['dropped', 'withdrawn'] } },
            { $set: fields, $unset: { grade: '', [otherStamp]: '' } },
            { returnDocument: 'after' }
        );
        if (!enrollment) enrollment = await Enrollment.create({ studentId, sectionId: section._id, ...fields });
    } catch (err) {
        await release();
        if (err.code === 11000) throw new AppError(409, 'Already registered for this section');
        throw err;
    }

    await enrollment.populate(POPULATE);
    const json = await present(enrollment);
    json.warnings = warnings;
    return res.status(201).json(json);
};

// Frees the seat or waitlist slot an active enrollment held, promoting from the waitlist.
async function vacate(previousStatus, sectionId) {
    if (previousStatus === 'enrolled') {
        await releaseSeat(sectionId);
        await fillFromWaitlist(sectionId);
    } else if (previousStatus === 'waitlisted') {
        await releaseWaitlistSlot(sectionId);
    }
}

// PATCH /api/enrollments/:id  { status?, grade? }  (see enrollmentSchemas for the shapes)
exports.updateEnrollment = async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) throw new AppError(404, 'Enrollment not found with that ID');
    const { status, grade } = req.body;
    const role = req.userRole;
    const isOwner = idOf(enrollment.studentId) === req.userId;

    if (status === 'dropped' || status === 'withdrawn') {
        if (status === 'withdrawn' && role !== 'admin') throw new AppError(403, 'Only admins can withdraw a student');
        if (status === 'dropped' && !(role === 'admin' || (role === 'student' && isOwner))) {
            throw new AppError(403, 'You can only drop your own enrollments');
        }
        if (status === 'dropped' && role !== 'admin') {
            const term = await Term.findById(enrollment.termId);
            if (!registrationOpen(term)) {
                throw new AppError(409, `Registration for ${term.name} is closed; ask an admin to withdraw you`);
            }
        }

        // conditional update so two drops of the same enrollment can't both free a seat
        const previous = await Enrollment.findOneAndUpdate(
            { _id: enrollment._id, status: { $in: ACTIVE } },
            { $set: { status } },
            { returnDocument: 'before' }
        );
        if (!previous) throw new AppError(409, `Only enrolled or waitlisted enrollments can be ${status}`);
        await vacate(previous.status, enrollment.sectionId);
    } else {
        // completing with a grade, or changing a completed grade
        const section = await Section.findById(enrollment.sectionId);
        if (!(role === 'admin' || (role === 'instructor' && section && (await teaches(req.userId, section))))) {
            throw new AppError(403, "Only the section's instructor or an admin can set grades");
        }
        if (status === 'completed') {
            const done = await Enrollment.findOneAndUpdate(
                { _id: enrollment._id, status: 'enrolled' },
                { $set: { status: 'completed', grade } },
                { returnDocument: 'after' }
            );
            if (!done) throw new AppError(409, 'Only enrolled students can be completed');
        } else {
            if (enrollment.status !== 'completed') throw new AppError(409, 'Only completed enrollments have a grade to change');
            await Enrollment.updateOne({ _id: enrollment._id }, { $set: { grade } });
        }
    }

    const updated = await Enrollment.findById(enrollment._id).populate(POPULATE);
    return res.status(200).json(await present(updated));
};

// DELETE /api/enrollments/:id (admin only): removes a record entered by mistake.
// Active enrollments give their seat back first.
exports.deleteEnrollment = async (req, res) => {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) throw new AppError(404, 'Enrollment not found with that ID');
    await vacate(enrollment.status, enrollment.sectionId);
    return res.status(200).json(enrollment);
};
