const { Course } = require('../../models');
const AppError = require('./AppError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// copy only the allowed keys that were actually sent
const pick = (body, allowed) =>
    Object.fromEntries(allowed.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// case-insensitive "contains" match across several fields, for ?q=
const searchFilter = (q, fields) => {
    if (!q) return {};
    const rx = escapeRegex(q);
    return { $or: fields.map((f) => ({ [f]: { $regex: rx, $options: 'i' } })) };
};

// refs: [{ field, Model, many }]. Every id sent for those fields must exist.
async function assertRefs(body, refs) {
    const details = {};
    for (const { field, Model, many } of refs) {
        const value = body[field];
        if (value === undefined || value === null) continue;
        const ids = [...new Set((many ? value : [value]).map(String))];
        if (ids.length && (await Model.countDocuments({ _id: { $in: ids } })) !== ids.length) {
            details[field] = 'references a record that does not exist';
        }
    }
    if (Object.keys(details).length) throw new AppError(400, 'Validation Failed', details);
}

// 409 when other records still point at the one being deleted
async function blockIfUsed(Model, filter, message) {
    if (await Model.exists(filter)) throw new AppError(409, message);
}

// every courseId found in a prereq tree
const collectCourseIds = (node, out = []) => {
    if (!node) return out;
    if (node.courseId) out.push(String(node.courseId));
    if (node.items) node.items.forEach((n) => collectCourseIds(n, out));
    return out;
};

async function assertCoursesExist(ids, field) {
    const unique = [...new Set(ids.map(String))];
    if (unique.length && (await Course.countDocuments({ _id: { $in: unique } })) !== unique.length) {
        throw new AppError(400, 'Validation Failed', { [field]: 'references a course that does not exist' });
    }
}

module.exports = { pick, searchFilter, assertRefs, blockIfUsed, collectCourseIds, assertCoursesExist };
