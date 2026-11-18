const { z } = require('zod');
const { objectId } = require('./common');
const { GRADES } = require('../utils/enrollmentRules');
const { STATUSES } = require('../../models/Enrollment');

// POST /api/enrollments
// Students register themselves (studentId omitted or their own id).
// Admins register a student by sending studentId.
const createEnrollmentSchema = z.object({
    sectionId: objectId,
    studentId: objectId.optional()
});

// PATCH /api/enrollments/:id
//   { status: 'dropped' }                 student (own, while registration is open) or admin
//   { status: 'withdrawn' }               admin
//   { status: 'completed', grade: 'B+' }  the section's instructor or admin
//   { grade: 'A-' }                       change the grade of a completed enrollment
const updateEnrollmentSchema = z
    .object({
        status: z.enum(['dropped', 'withdrawn', 'completed']).optional(),
        grade: z.enum(GRADES).optional()
    })
    .refine((v) => Object.keys(v).length > 0, 'Provide status and/or grade')
    .refine((v) => v.status !== 'completed' || v.grade, { message: 'grade is required to complete an enrollment', path: ['grade'] })
    .refine((v) => !v.grade || !v.status || v.status === 'completed', {
        message: 'grade can only be set when completing',
        path: ['grade']
    });

// GET /api/enrollments?studentId=&sectionId=&termId=&courseId=&status=&page=&limit=
const enrollmentQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    studentId: objectId.optional(),
    sectionId: objectId.optional(),
    termId: objectId.optional(),
    courseId: objectId.optional(),
    status: z.enum(STATUSES).optional()
});

module.exports = { createEnrollmentSchema, updateEnrollmentSchema, enrollmentQuerySchema };
