const { Course, Department, Section, Enrollment, Program } = require('../../models');
const AppError = require('../utils/AppError');
const {
    pick, searchFilter, assertRefs, blockIfUsed, collectCourseIds, assertCoursesExist
} = require('../utils/catalogHelpers');

const FIELDS = [
    'subject', 'number', 'title', 'credits', 'description',
    'departmentId', 'attributes', 'prereqs', 'coreqs', 'prereqText'
];
const REFS = [
    { field: 'departmentId', Model: Department },
    { field: 'coreqs', Model: Course, many: true }
];
const POPULATE = [{ path: 'departmentId', select: 'code name' }];

// prereq tree and coreqs must point at real courses, and never at the course itself
async function checkCourseLinks(body, course) {
    if (body.prereqs !== undefined) {
        const ids = collectCourseIds(body.prereqs);
        if (course && ids.includes(String(course._id))) {
            throw new AppError(400, 'Validation Failed', { prereqs: 'a course cannot require itself' });
        }
        await assertCoursesExist(ids, 'prereqs');
    }
    if (course && body.coreqs?.map(String).includes(String(course._id))) {
        throw new AppError(400, 'Validation Failed', { coreqs: 'a course cannot be its own corequisite' });
    }
}

// GET /api/courses?page=&limit=&q=&departmentId=&subject=&attribute=
exports.listCourses = async (req, res) => {
    const { page, limit, q, departmentId, subject, attribute } = req.parsedQuery;
    const filter = searchFilter(q, ['code', 'title']);
    if (departmentId) filter.departmentId = departmentId;
    if (subject) filter.subject = subject;
    if (attribute) filter.attributes = attribute;

    const [items, total] = await Promise.all([
        Course.find(filter).sort({ code: 1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
        Course.countDocuments(filter)
    ]);
    return res.status(200).json({ items, total, page, limit });
};

// GET /api/courses/:id
exports.getCourse = async (req, res) => {
    const course = await Course.findById(req.params.id).populate(POPULATE);
    if (!course) throw new AppError(404, 'Course not found with that ID');
    return res.status(200).json(course);
};

// POST /api/courses (admin only)
// code ("COP4331") is derived from subject + number by the model's pre-validate hook
exports.createCourse = async (req, res) => {
    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);
    await checkCourseLinks(body);

    const course = await Course.create(body);
    return res.status(201).json(course);
};

// PATCH /api/courses/:id (admin only)
exports.updateCourse = async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError(404, 'Course not found with that ID');

    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);
    await checkCourseLinks(body, course);

    for (const [field, value] of Object.entries(body)) course.set(field, value);
    if (body.prereqs !== undefined) course.markModified('prereqs');   // Mixed paths are not change-tracked

    const updated = await course.save();
    return res.status(200).json(updated);
};

// DELETE /api/courses/:id (admin only)
// note: other courses' prereq trees are not scanned for references to this course
exports.deleteCourse = async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError(404, 'Course not found with that ID');

    await blockIfUsed(Section, { courseId: course._id }, 'Course has sections; cancel or remove them first');
    await blockIfUsed(Enrollment, { courseId: course._id }, 'Course appears in enrollment history');
    await blockIfUsed(Program, { 'requirements.courseIds': course._id }, 'Course is used by a program requirement');
    await blockIfUsed(Course, { coreqs: course._id }, 'Course is a corequisite of another course');

    await course.deleteOne();
    return res.status(200).json(course);
};
