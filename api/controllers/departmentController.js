const { Department, Course, Program, Instructor } = require('../../models');
const AppError = require('../utils/AppError');
const { pick, searchFilter, blockIfUsed } = require('../utils/catalogHelpers');

const FIELDS = ['code', 'name'];

// GET /api/departments?page=&limit=&q=
exports.listDepartments = async (req, res) => {
    const { page, limit, q } = req.parsedQuery;
    const filter = searchFilter(q, ['code', 'name']);

    const [items, total] = await Promise.all([
        Department.find(filter).sort({ code: 1 }).skip((page - 1) * limit).limit(limit),
        Department.countDocuments(filter)
    ]);
    return res.status(200).json({ items, total, page, limit });
};

// GET /api/departments/:id
exports.getDepartment = async (req, res) => {
    const department = await Department.findById(req.params.id);
    if (!department) throw new AppError(404, 'Department not found with that ID');
    return res.status(200).json(department);
};

// POST /api/departments (admin only)
exports.createDepartment = async (req, res) => {
    const department = await Department.create(pick(req.body, FIELDS));
    return res.status(201).json(department);
};

// PATCH /api/departments/:id (admin only)
exports.updateDepartment = async (req, res) => {
    const department = await Department.findById(req.params.id);
    if (!department) throw new AppError(404, 'Department not found with that ID');

    for (const [field, value] of Object.entries(pick(req.body, FIELDS))) department.set(field, value);

    // save() (not findByIdAndUpdate) so validators and hooks run
    const updated = await department.save();
    return res.status(200).json(updated);
};

// DELETE /api/departments/:id (admin only)
exports.deleteDepartment = async (req, res) => {
    const department = await Department.findById(req.params.id);
    if (!department) throw new AppError(404, 'Department not found with that ID');

    await blockIfUsed(Course, { departmentId: department._id }, 'Department still has courses');
    await blockIfUsed(Program, { departmentId: department._id }, 'Department still has programs');
    await blockIfUsed(Instructor, { departmentId: department._id }, 'Department still has instructors');

    await department.deleteOne();
    return res.status(200).json(department);
};
