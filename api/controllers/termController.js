const { Term, Section } = require('../../models');
const AppError = require('../utils/AppError');
const { pick, searchFilter, blockIfUsed } = require('../utils/catalogHelpers');

const FIELDS = ['name', 'year', 'season', 'startDate', 'endDate', 'registrationOpens', 'registrationCloses'];

// GET /api/terms?page=&limit=&q=&year=&season=
exports.listTerms = async (req, res) => {
    const { page, limit, q, year, season } = req.parsedQuery;
    const filter = searchFilter(q, ['name']);
    if (year !== undefined) filter.year = year;
    if (season) filter.season = season;

    const [items, total] = await Promise.all([
        Term.find(filter).sort({ startDate: -1 }).skip((page - 1) * limit).limit(limit),
        Term.countDocuments(filter)
    ]);
    return res.status(200).json({ items, total, page, limit });
};

// GET /api/terms/:id
exports.getTerm = async (req, res) => {
    const term = await Term.findById(req.params.id);
    if (!term) throw new AppError(404, 'Term not found with that ID');
    return res.status(200).json(term);
};

// POST /api/terms (admin only)
exports.createTerm = async (req, res) => {
    const term = await Term.create(pick(req.body, FIELDS));
    return res.status(201).json(term);
};

// PATCH /api/terms/:id (admin only)
// date-order checks live in the model's pre-validate hook and run against the merged document
exports.updateTerm = async (req, res) => {
    const term = await Term.findById(req.params.id);
    if (!term) throw new AppError(404, 'Term not found with that ID');

    for (const [field, value] of Object.entries(pick(req.body, FIELDS))) term.set(field, value);

    const updated = await term.save();
    return res.status(200).json(updated);
};

// DELETE /api/terms/:id (admin only)
exports.deleteTerm = async (req, res) => {
    const term = await Term.findById(req.params.id);
    if (!term) throw new AppError(404, 'Term not found with that ID');

    await blockIfUsed(Section, { termId: term._id }, 'Term still has sections');

    await term.deleteOne();
    return res.status(200).json(term);
};
