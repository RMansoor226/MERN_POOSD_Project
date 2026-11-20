import { formatDate, instructorName, MODALITY_LABELS } from '../format.js';

// One entry per admin-managed collection. The generic list and form pages read these.
//
//   path        API collection path
//   label(doc)  how a record appears in pickers and messages
//   columns     list table: [{ label, render(doc) }]
//   fields      form: [{ name, label, type, required, ref, options, createOnly, hint, ... }]
//               types: text, textarea, number, select, date, ref, refMulti, tags,
//                      meetings, prereqs, requirements
//   searchable  list has a search box (backend `q`)
//   filters     list dropdowns: [{ name, label, ref | options }]
//   paginated   false when the endpoint returns a plain array (users)
//   canCreate   false to hide "New"
//   canDelete(doc, session) optional per-row guard

const SEASONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
];
const PROGRAM_TYPES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'certificate', label: 'Certificate' },
];
const SECTION_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const MODALITIES = Object.entries(MODALITY_LABELS).map(([value, label]) => ({ value, label }));

const name = (o) => o?.name ?? '—';

export const RESOURCES = {
  departments: {
    title: 'Departments',
    singular: 'department',
    path: '/departments',
    searchable: true,
    label: (d) => `${d.code} — ${d.name}`,
    columns: [
      { label: 'Code', render: (d) => d.code, mono: true },
      { label: 'Name', render: (d) => d.name },
    ],
    fields: [
      { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'CS' },
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Computer Science' },
    ],
  },

  terms: {
    title: 'Terms',
    singular: 'term',
    path: '/terms',
    searchable: true,
    label: (t) => t.name,
    columns: [
      { label: 'Name', render: (t) => t.name },
      { label: 'Classes', render: (t) => `${formatDate(t.startDate)} – ${formatDate(t.endDate)}` },
      { label: 'Registration', render: (t) => `${formatDate(t.registrationOpens)} – ${formatDate(t.registrationCloses)}` },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Fall 2027' },
      { name: 'year', label: 'Year', type: 'number', required: true, half: true },
      { name: 'season', label: 'Season', type: 'select', required: true, options: SEASONS, half: true },
      { name: 'startDate', label: 'Classes start', type: 'date', required: true, half: true },
      { name: 'endDate', label: 'Classes end', type: 'date', required: true, half: true },
      { name: 'registrationOpens', label: 'Registration opens', type: 'date', required: true, half: true },
      { name: 'registrationCloses', label: 'Registration closes', type: 'date', required: true, half: true },
    ],
  },

  instructors: {
    title: 'Instructors',
    singular: 'instructor',
    path: '/instructors',
    searchable: true,
    label: (i) => `${i.lastName}, ${i.firstName}`,
    filters: [{ name: 'departmentId', label: 'Department', ref: 'departments' }],
    columns: [
      { label: 'Name', render: instructorName },
      { label: 'Title', render: (i) => i.title || '—' },
      { label: 'Email', render: (i) => i.email || '—' },
    ],
    fields: [
      { name: 'firstName', label: 'First name', type: 'text', required: true, half: true },
      { name: 'lastName', label: 'Last name', type: 'text', required: true, half: true },
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Associate Professor' },
      { name: 'email', label: 'Email', type: 'text', inputType: 'email' },
      { name: 'departmentId', label: 'Department', type: 'ref', ref: 'departments' },
      {
        name: 'userId',
        label: 'Login account',
        type: 'ref',
        ref: 'users',
        refWhere: (u) => u.role === 'instructor',
        hint: 'Links an instructor-role login so they see their sections on their home page.',
      },
    ],
  },

  courses: {
    title: 'Courses',
    singular: 'course',
    path: '/courses',
    searchable: true,
    label: (c) => `${c.code} — ${c.title}`,
    filters: [{ name: 'departmentId', label: 'Department', ref: 'departments' }],
    columns: [
      { label: 'Code', render: (c) => c.code, mono: true },
      { label: 'Title', render: (c) => c.title },
      { label: 'Credits', render: (c) => c.credits },
      { label: 'Department', render: (c) => name(c.departmentId) },
    ],
    fields: [
      { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'COP', half: true },
      { name: 'number', label: 'Number', type: 'text', required: true, placeholder: '4331', half: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'credits', label: 'Credits', type: 'number', required: true, half: true, step: '0.5' },
      { name: 'departmentId', label: 'Department', type: 'ref', ref: 'departments', half: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      {
        name: 'attributes',
        label: 'Attributes',
        type: 'tags',
        placeholder: 'Writing Intensive, GenEd-Math',
        hint: 'Separate with commas.',
      },
      { name: 'prereqs', label: 'Prerequisites', type: 'prereqs' },
      {
        name: 'prereqText',
        label: 'Other requirements',
        type: 'text',
        placeholder: 'Junior standing',
        hint: 'Rules that are not courses.',
      },
      { name: 'coreqs', label: 'Corequisites', type: 'refMulti', ref: 'courses', excludeSelf: true },
    ],
  },

  sections: {
    title: 'Sections',
    singular: 'section',
    path: '/sections',
    label: (s) => `${s.courseId?.code ?? 'Section'} ${s.sectionNumber} (CRN ${s.crn})`,
    filters: [
      { name: 'termId', label: 'Term', ref: 'terms' },
      { name: 'status', label: 'Status', options: SECTION_STATUSES },
    ],
    columns: [
      { label: 'CRN', render: (s) => s.crn, mono: true },
      { label: 'Course', render: (s) => s.courseId?.code ?? '—' },
      { label: 'Sec', render: (s) => s.sectionNumber },
      { label: 'Term', render: (s) => name(s.termId) },
      { label: 'Seats', render: (s) => `${s.enrolledCount ?? 0}/${s.capacity}` },
      { label: 'Status', render: (s) => s.status },
    ],
    fields: [
      {
        name: 'courseId',
        label: 'Course',
        type: 'ref',
        ref: 'courses',
        required: true,
        createOnly: true,
        hint: 'Cannot be changed after the section is created.',
      },
      {
        name: 'termId',
        label: 'Term',
        type: 'ref',
        ref: 'terms',
        required: true,
        createOnly: true,
        hint: 'Cannot be changed after the section is created.',
      },
      { name: 'sectionNumber', label: 'Section number', type: 'text', required: true, placeholder: '0001', half: true },
      { name: 'crn', label: 'CRN', type: 'text', required: true, placeholder: '10042', half: true },
      { name: 'instructorIds', label: 'Instructors', type: 'refMulti', ref: 'instructors' },
      { name: 'meetings', label: 'Meeting times', type: 'meetings' },
      { name: 'modality', label: 'Mode', type: 'select', options: MODALITIES, default: 'in-person', half: true },
      { name: 'status', label: 'Status', type: 'select', options: SECTION_STATUSES, default: 'open', half: true },
      { name: 'capacity', label: 'Capacity', type: 'number', required: true, half: true },
      { name: 'waitlistCapacity', label: 'Waitlist capacity', type: 'number', half: true, default: '0' },
    ],
  },

  programs: {
    title: 'Programs',
    singular: 'program',
    path: '/programs',
    searchable: true,
    label: (p) => p.name,
    filters: [{ name: 'type', label: 'Type', options: PROGRAM_TYPES }],
    columns: [
      { label: 'Name', render: (p) => p.name },
      { label: 'Type', render: (p) => [p.degree, p.type].filter(Boolean).join(' ') },
      { label: 'Catalog', render: (p) => p.catalogYear },
      { label: 'Credits', render: (p) => p.totalCredits ?? '—' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: PROGRAM_TYPES, required: true, half: true },
      { name: 'degree', label: 'Degree', type: 'text', placeholder: 'BS', half: true },
      { name: 'catalogYear', label: 'Catalog year', type: 'number', required: true, half: true },
      { name: 'totalCredits', label: 'Total credits', type: 'number', half: true },
      { name: 'departmentId', label: 'Department', type: 'ref', ref: 'departments' },
      { name: 'requirements', label: 'Requirements', type: 'requirements' },
    ],
  },

  users: {
    title: 'Users',
    singular: 'user',
    path: '/users',
    paginated: false,
    canCreate: false,
    canDelete: (u, session) => String(u._id) !== String(session.id),
    label: (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.login,
    search: (u) => [u.firstName, u.lastName, u.login, u.email].filter(Boolean).join(' '),
    filters: [
      {
        name: 'role',
        label: 'Role',
        options: ['student', 'advisor', 'instructor', 'admin'].map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) })),
      },
    ],
    columns: [
      { label: 'Name', render: (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || '—' },
      { label: 'Login', render: (u) => u.login, mono: true },
      { label: 'Email', render: (u) => u.email || '—' },
      { label: 'Role', render: (u) => u.role },
      { label: 'Programs', render: (u) => u.declarations?.length ?? 0 },
    ],
    fields: [
      { name: 'firstName', label: 'First name', type: 'text', half: true },
      { name: 'lastName', label: 'Last name', type: 'text', half: true },
      { name: 'email', label: 'Email', type: 'text', inputType: 'email', hint: 'Leave blank to remove.' },
    ],
    note: 'Logins, passwords and roles cannot be changed through the API. New accounts are created on the Register page.',
  },
};

export const RESOURCE_KEYS = Object.keys(RESOURCES);
