const { Program, Department, User } = require('../../models');
const AppError = require('../utils/AppError');
const { pick, searchFilter, assertRefs, blockIfUsed, assertCoursesExist } = require('../utils/catalogHelpers');

const FIELDS = ['name', 'type', 'degree', 'departmentId', 'catalogYear', 'totalCredits', 'requirements'];
const REFS = [{ field: 'departmentId', Model: Department }];

// every course named in a requirement must exist
async function checkRequirements(body) {
    if (!body.requirements) return;
    await assertCoursesExist(body.requirements.flatMap((r) => r.courseIds ?? []), 'requirements');
}

// GET /api/programs?page=&limit=&q=&type=&departmentId=&catalogYear=
exports.listPrograms = async (req, res) => {
    const { page, limit, q, type, departmentId, catalogYear } = req.parsedQuery;
    const filter = searchFilter(q, ['name']);
    if (type) filter.type = type;
    if (departmentId) filter.departmentId = departmentId;
    if (catalogYear !== undefined) filter.catalogYear = catalogYear;

    const [items, total] = await Promise.all([
        Program.find(filter).sort({ type: 1, name: 1 }).skip((page - 1) * limit).limit(limit),
        Program.countDocuments(filter)
    ]);
    return res.status(200).json({ items, total, page, limit });
};

// GET /api/programs/:id
exports.getProgram = async (req, res) => {
    const program = await Program.findById(req.params.id);
    if (!program) throw new AppError(404, 'Program not found with that ID');
    return res.status(200).json(program);
};

// POST /api/programs (admin only)
exports.createProgram = async (req, res) => {
    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);
    await checkRequirements(body);

    const program = await Program.create(body);
    return res.status(201).json(program);
};

// PATCH /api/programs/:id (admin only)
// requirements replaces the entire array
exports.updateProgram = async (req, res) => {
    const program = await Program.findById(req.params.id);
    if (!program) throw new AppError(404, 'Program not found with that ID');

    const body = pick(req.body, FIELDS);
    await assertRefs(body, REFS);
    await checkRequirements(body);

    for (const [field, value] of Object.entries(body)) program.set(field, value);

    const updated = await program.save();
    return res.status(200).json(updated);
};

// DELETE /api/programs/:id (admin only)
exports.deleteProgram = async (req, res) => {
    const program = await Program.findById(req.params.id);
    if (!program) throw new AppError(404, 'Program not found with that ID');

    await blockIfUsed(User, { 'declarations.programId': program._id }, 'Program has declared students');

    await program.deleteOne();
    return res.status(200).json(program);
};
