const { Instructor, User, Department, Section } = require('../../models');
const AppError = require('../utils/AppError');
const { pick, searchFilter, assertRefs, blockIfUsed } = require('../utils/catalogHelpers');

const FIELDS = ['userId', 'firstName', 'lastName', 'email', 'title', 'departmentId'];
const REFS = [
    { field: 'userId', Model: User },
    { field: 'departmentId', Model: Department }
];

// GET /api/instructors?page=&limit=&q=&departmentId=
exports.listInstructors = async (req, res) => {
    const { page, limit, q, departmentId } = req.parsedQuery;
    const filter = searchFilter(q, ['firstName', 'lastName', 'email']);
    if (departmentId) filter.departmentId = departmentId;

    const [items, total] = await Promise.all([
        Instructor.find(filter).sort({ lastName: 1, firstName: 1 }).skip((page - 1) * limit).limit(limit),
        Instructor.countDocuments(filter)
    ]);
    return res.status(200).json({ items, total, page, limit });
};

// GET /api/instructors/:id
exports.getInstructor = async (req, res) => {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) throw new AppError(404, 'Instructor not found with that ID');
    return res.status(200).json(instructor);
};

// POST /api/instructors (admin only)
exports.createInstructor = async (req, res) => {
    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);

    const instructor = await Instructor.create(body);
    return res.status(201).json(instructor);
};

// PATCH /api/instructors/:id (admin only)
exports.updateInstructor = async (req, res) => {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) throw new AppError(404, 'Instructor not found with that ID');

    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);

    for (const [field, value] of Object.entries(body)) instructor.set(field, value);

    const updated = await instructor.save();
    return res.status(200).json(updated);
};

// DELETE /api/instructors/:id (admin only)
exports.deleteInstructor = async (req, res) => {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) throw new AppError(404, 'Instructor not found with that ID');

    await blockIfUsed(Section, { instructorIds: instructor._id }, 'Instructor is assigned to sections');

    await instructor.deleteOne();
    return res.status(200).json(instructor);
};
