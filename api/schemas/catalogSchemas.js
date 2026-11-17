const { z } = require('zod');
const { objectId, optionalEmail } = require('./common');

const GRADES = ['A', 'B', 'C', 'D'];
const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];
const SEASONS = ['spring', 'summer', 'fall'];

const text = (max = 100) => z.string().trim().min(1, 'Required').max(max);
const optionalText = (max = 100) => z.string().trim().max(max).optional();
const atLeastOne = (v) => Object.keys(v).length > 0;

const paging = {
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(100).optional()
};

// base = create shape. update = same keys, all optional, minus immutable keys.
function resource(base, { filters = {}, immutable = [] } = {}) {
    const obj = z.object(base);
    const editable = immutable.length
        ? obj.omit(Object.fromEntries(immutable.map((k) => [k, true])))
        : obj;
    return {
        create: obj,
        update: editable.partial().refine(atLeastOne, 'Provide at least one updatable field'),
        query: z.object({ ...paging, ...filters })
    };
}

// --- department -----------------------------------------------------------
const department = resource({
    code: text(10),
    name: text(100)
});

// --- term -----------------------------------------------------------------
const term = resource(
    {
        name: text(50),
        year: z.number().int().min(2000).max(2100),
        season: z.enum(SEASONS),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        registrationOpens: z.coerce.date(),
        registrationCloses: z.coerce.date()
    },
    { filters: { year: z.coerce.number().int().optional(), season: z.enum(SEASONS).optional() } }
);

// --- course (prereqs is a recursive AND/OR tree) ---------------------------
const prereqLeaf = z.object({
    courseId: objectId,
    minGrade: z.enum(GRADES).optional(),
    concurrentOk: z.boolean().optional()
});
const prereqNode = z.lazy(() => z.union([prereqLeaf, prereqGroup]));
const prereqGroup = z.object({
    op: z.enum(['AND', 'OR']),
    items: z.array(prereqNode).min(1).max(20)
});

const course = resource(
    {
        subject: text(10),
        number: text(10),
        title: text(150),
        credits: z.number().min(0).max(12),
        description: optionalText(2000),
        departmentId: objectId.optional(),
        attributes: z.array(text(50)).max(20).optional(),
        prereqs: prereqNode.nullable().optional(),
        coreqs: z.array(objectId).max(10).optional(),
        prereqText: optionalText(200)
    },
    {
        filters: {
            departmentId: objectId.optional(),
            subject: z.string().trim().toUpperCase().max(10).optional(),
            attribute: z.string().trim().max(50).optional()
        }
    }
);

// --- instructor -------------------------------------------------------------
const instructor = resource(
    {
        userId: objectId.optional(),
        firstName: text(50),
        lastName: text(50),
        email: optionalEmail,
        title: optionalText(100),
        departmentId: objectId.optional()
    },
    { filters: { departmentId: objectId.optional() } }
);

// --- section (enrolledCount / waitlistCount are system-managed: never accepted)
const meeting = z
    .object({
        days: z.array(z.enum(DAYS)).min(1).max(7),
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
        building: optionalText(50),
        room: optionalText(20)
    })
    .refine((m) => m.endMinute > m.startMinute, {
        message: 'endMinute must be greater than startMinute',
        path: ['endMinute']
    });

const section = resource(
    {
        courseId: objectId,
        termId: objectId,
        sectionNumber: text(10),
        crn: text(10),
        instructorIds: z.array(objectId).max(10).optional(),
        meetings: z.array(meeting).max(10).optional(),
        modality: z.enum(['in-person', 'online', 'hybrid']).optional(),
        capacity: z.number().int().min(0).max(1000),
        waitlistCapacity: z.number().int().min(0).max(1000).optional(),
        status: z.enum(['open', 'closed', 'cancelled']).optional()
    },
    {
        immutable: ['courseId', 'termId'],
        filters: {
            termId: objectId.optional(),
            courseId: objectId.optional(),
            instructorId: objectId.optional(),
            status: z.enum(['open', 'closed', 'cancelled']).optional(),
            modality: z.enum(['in-person', 'online', 'hybrid']).optional()
        }
    }
);

// --- program ----------------------------------------------------------------
const requirement = z
    .object({
        name: text(100),
        rule: z.enum(['all', 'anyN', 'minCredits']),
        n: z.number().int().min(1).optional(),
        credits: z.number().int().min(1).optional(),
        courseIds: z.array(objectId).max(100).optional(),
        filter: z
            .object({
                subject: optionalText(10),
                minLevel: z.number().int().min(0).max(9999).optional(),
                attribute: optionalText(50)
            })
            .optional()
    })
    .refine((r) => r.rule !== 'anyN' || r.n, { message: 'n is required when rule is anyN', path: ['n'] })
    .refine((r) => r.rule !== 'minCredits' || r.credits, {
        message: 'credits is required when rule is minCredits',
        path: ['credits']
    });

const program = resource(
    {
        name: text(100),
        type: z.enum(['major', 'minor', 'certificate']),
        degree: optionalText(20),
        departmentId: objectId.optional(),
        catalogYear: z.number().int().min(1900).max(2100),
        totalCredits: z.number().min(0).max(300).optional(),
        requirements: z.array(requirement).max(50).optional()
    },
    {
        filters: {
            type: z.enum(['major', 'minor', 'certificate']).optional(),
            departmentId: objectId.optional(),
            catalogYear: z.coerce.number().int().optional()
        }
    }
);

module.exports = { department, term, course, instructor, section, program };