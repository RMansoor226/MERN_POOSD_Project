const { Section, Course, Term, Instructor, Enrollment } = require('../../models');
const AppError = require('../utils/AppError');
const { pick, assertRefs, blockIfUsed } = require('../utils/catalogHelpers');

// enrolledCount and waitlistCount are never accepted from clients: the enrollment flow owns them
const FIELDS = ['sectionNumber', 'crn', 'instructorIds', 'meetings', 'modality',
                'capacity', 'waitlistCapacity', 'status'];
// Enrollment copies courseId and termId from the section, so they cannot change after creation
const CREATE_ONLY = ['courseId', 'termId'];

const REFS = [
    { field: 'courseId', Model: Course },
    { field: 'termId', Model: Term },
    { field: 'instructorIds', Model: Instructor, many: true }
];
const POPULATE = [
    { path: 'courseId', select: 'code title credits' },
    { path: 'termId', select: 'name' },
    { path: 'instructorIds', select: 'firstName lastName title' }
];

// GET /api/sections?page=&limit=&termId=&courseId=&instructorId=&status=&modality=
exports.listSections = async (req, res) => {
    const { page, limit, termId, courseId, instructorId, status, modality } = req.parsedQuery;
    const filter = {};
    if (termId) filter.termId = termId;
    if (courseId) filter.courseId = courseId;
    if (instructorId) filter.instructorIds = instructorId;
    if (status) filter.status = status;
    if (modality) filter.modality = modality;

    const [items, total] = await Promise.all([
        Section.find(filter).sort({ crn: 1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE),
        Section.countDocuments(filter)
    ]);
    return res.status(200).json({ items, total, page, limit });
};

// GET /api/sections/:id
exports.getSection = async (req, res) => {
    const section = await Section.findById(req.params.id).populate(POPULATE);
    if (!section) throw new AppError(404, 'Section not found with that ID');
    return res.status(200).json(section);
};

// POST /api/sections (admin only)
exports.createSection = async (req, res) => {
    const body = pick(req.body, [...FIELDS, ...CREATE_ONLY]);
    await assertRefs(body, REFS);

    const section = await Section.create(body);
    return res.status(201).json(section);
};

// PATCH /api/sections/:id (admin only)
// lowering capacity below enrolledCount fails in the model's pre-validate hook
exports.updateSection = async (req, res) => {
    const section = await Section.findById(req.params.id);
    if (!section) throw new AppError(404, 'Section not found with that ID');

    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);

    for (const [field, value] of Object.entries(body)) section.set(field, value);

    const updated = await section.save();
    return res.status(200).json(updated);
};

// DELETE /api/sections/:id (admin only)
exports.deleteSection = async (req, res) => {
    const section = await Section.findById(req.params.id);
    if (!section) throw new AppError(404, 'Section not found with that ID');

    await blockIfUsed(Enrollment, { sectionId: section._id },
        "Section has enrollments; set its status to 'cancelled' instead");

    await section.deleteOne();
    return res.status(200).json(section);
};
