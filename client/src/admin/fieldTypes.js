// Converting between API documents and form state, one field type at a time.
//
//   toForm(field, docValue)   -> what the form input holds
//   toBody(field, formValue)  -> what the API receives (undefined = leave the key out)
//   check(field, formValue)   -> client-side error message, or ''
//
// The backend validates everything again; these checks only catch the obvious
// mistakes before a round trip.

const idOf = (v) => (v && typeof v === 'object' ? String(v._id ?? '') : v ? String(v) : '');

// minutes from midnight <-> "HH:MM" for <input type="time">
export const minutesToTime = (m) =>
  m == null ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const timeToMinutes = (t) => {
  if (!t) return NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// --- prerequisite tree -------------------------------------------------------
// The editor always works on a group at the root; a lone leaf is wrapped in an AND group.

function prereqToForm(node) {
  if (!node) return null;
  const convert = (n) =>
    n.courseId !== undefined
      ? { courseId: idOf(n.courseId), minGrade: n.minGrade ?? '', concurrentOk: Boolean(n.concurrentOk) }
      : { op: n.op, items: (n.items ?? []).map(convert) };
  const root = convert(node);
  return root.op ? root : { op: 'AND', items: [root] };
}

// Drops blank rows and empty groups. An empty tree becomes null ("no prerequisites").
export function prereqToBody(node) {
  if (!node) return null;
  if (node.op === undefined) {
    if (!node.courseId) return null;
    const leaf = { courseId: node.courseId };
    if (node.minGrade) leaf.minGrade = node.minGrade;
    if (node.concurrentOk) leaf.concurrentOk = true;
    return leaf;
  }
  const items = node.items.map(prereqToBody).filter(Boolean);
  return items.length ? { op: node.op, items } : null;
}

// --- program requirements ------------------------------------------------------

const requirementToForm = (r) => ({
  name: r.name ?? '',
  rule: r.rule ?? 'all',
  n: r.n != null ? String(r.n) : '',
  credits: r.credits != null ? String(r.credits) : '',
  courseIds: (r.courseIds ?? []).map(idOf),
  filter: {
    subject: r.filter?.subject ?? '',
    minLevel: r.filter?.minLevel != null ? String(r.filter.minLevel) : '',
    attribute: r.filter?.attribute ?? '',
  },
});

function requirementToBody(r) {
  const out = { name: r.name.trim(), rule: r.rule, courseIds: r.courseIds };
  if (r.rule === 'anyN') out.n = Number(r.n);
  if (r.rule === 'minCredits') out.credits = Number(r.credits);
  const filter = {};
  if (r.filter.subject.trim()) filter.subject = r.filter.subject.trim().toUpperCase();
  if (r.filter.minLevel !== '') filter.minLevel = Number(r.filter.minLevel);
  if (r.filter.attribute.trim()) filter.attribute = r.filter.attribute.trim();
  if (Object.keys(filter).length) out.filter = filter;
  return out;
}

function checkRequirements(list) {
  for (const [i, r] of list.entries()) {
    const label = r.name.trim() || `Requirement ${i + 1}`;
    if (!r.name.trim()) return `Requirement ${i + 1} needs a name.`;
    if (r.rule === 'anyN' && !(Number(r.n) >= 1)) return `${label}: enter how many courses to choose.`;
    if (r.rule === 'minCredits' && !(Number(r.credits) >= 1)) return `${label}: enter the minimum credits.`;
    const hasFilter = r.filter.subject.trim() || r.filter.minLevel !== '' || r.filter.attribute.trim();
    if (!r.courseIds.length && !hasFilter) return `${label}: pick courses or set a filter.`;
  }
  return '';
}

// --- section meetings ---------------------------------------------------------

const meetingToForm = (m) => ({
  days: m.days ?? [],
  start: minutesToTime(m.startMinute),
  end: minutesToTime(m.endMinute),
  building: m.building ?? '',
  room: m.room ?? '',
});

const meetingToBody = (m) => ({
  days: m.days,
  startMinute: timeToMinutes(m.start),
  endMinute: timeToMinutes(m.end),
  building: m.building.trim(),
  room: m.room.trim(),
});

function checkMeetings(list) {
  for (const [i, m] of list.entries()) {
    if (!m.days.length) return `Meeting ${i + 1}: pick at least one day.`;
    if (!m.start || !m.end) return `Meeting ${i + 1}: enter start and end times.`;
    if (timeToMinutes(m.end) <= timeToMinutes(m.start)) return `Meeting ${i + 1}: end time must be after start time.`;
  }
  return '';
}

// --- dispatch by type -----------------------------------------------------------

export function toForm(field, value) {
  switch (field.type) {
    case 'number':
      return value == null ? (field.default ?? '') : String(value);
    case 'date':
      return value ? String(value).slice(0, 10) : '';
    case 'ref':
      return idOf(value);
    case 'refMulti':
      return (value ?? []).map(idOf);
    case 'tags':
      return (value ?? []).join(', ');
    case 'prereqs':
      return prereqToForm(value);
    case 'requirements':
      return (value ?? []).map(requirementToForm);
    case 'meetings':
      return (value ?? []).map(meetingToForm);
    default:
      return value ?? field.default ?? '';
  }
}

export function toBody(field, value) {
  switch (field.type) {
    case 'number':
      return value === '' ? undefined : Number(value);
    case 'select':
    case 'ref':
      // optional refs can't be cleared through the API (an empty id fails validation)
      return value === '' ? undefined : value;
    case 'date':
      return value === '' ? undefined : value; // "YYYY-MM-DD" -> backend stores midnight UTC
    case 'refMulti':
      return value;
    case 'tags':
      return value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    case 'prereqs':
      return prereqToBody(value);
    case 'requirements':
      return value.map(requirementToBody);
    case 'meetings':
      return value.map(meetingToBody);
    default:
      return typeof value === 'string' ? value.trim() : value;
  }
}

export function check(field, value) {
  const blank = value === '' || value == null || (Array.isArray(value) && value.length === 0);
  if (field.required && blank) return `${field.label} is required.`;
  if (field.type === 'number' && value !== '' && Number.isNaN(Number(value))) return `${field.label} must be a number.`;
  if (field.type === 'requirements') return checkRequirements(value);
  if (field.type === 'meetings') return checkMeetings(value);
  return '';
}

// Default form values for a new record
export const emptyForm = (fields) => Object.fromEntries(fields.map((f) => [f.name, toForm(f, undefined)]));

// Backend error details use dotted paths ("meetings.0.endMinute"); group them by top-level field.
export function detailsByField(details = {}) {
  const out = {};
  for (const [path, message] of Object.entries(details)) {
    const key = path.split('.')[0];
    out[key] = out[key] ? `${out[key]} ${message}` : message;
  }
  return out;
}
