// Display helpers for catalog data.

const DAY_NAMES = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat', U: 'Sun' };

// 570 -> "9:30 AM" (sections store meeting times as minutes from midnight)
export function formatMinute(minute) {
  const h24 = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

// { days: ['M','W'], startMinute: 630, endMinute: 705 } -> "MW 10:30 AM – 11:45 AM"
export function formatMeetingTime(meeting) {
  return `${meeting.days.join('')} ${formatMinute(meeting.startMinute)} – ${formatMinute(meeting.endMinute)}`;
}

// Screen-reader friendly day list: ['M','W'] -> "Mon, Wed"
export const dayNames = (days) => days.map((d) => DAY_NAMES[d] ?? d).join(', ');

export function formatLocation(meeting) {
  return [meeting.building, meeting.room].filter(Boolean).join(' ') || 'TBA';
}

export const instructorName = (i) => [i.firstName, i.lastName].filter(Boolean).join(' ');

// Term dates are calendar dates saved as midnight UTC; formatting them in UTC keeps
// "Jan 11" from showing as "Jan 10" for users west of Greenwich.
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
    : '—';

export const MODALITY_LABELS = { 'in-person': 'In person', online: 'Online', hybrid: 'Hybrid' };

// Seats and waitlist, plus a single label for the status column.
export function seatInfo(section) {
  const enrolled = section.enrolledCount ?? 0;
  const open = Math.max(0, section.capacity - enrolled);
  const waitCap = section.waitlistCapacity ?? 0;
  const waitCount = section.waitlistCount ?? 0;

  let label;
  if (section.status === 'cancelled') label = 'Cancelled';
  else if (section.status === 'closed') label = 'Closed';
  else if (open > 0) label = 'Open';
  else if (waitCap > waitCount) label = 'Waitlist';
  else label = 'Full';

  return { open, capacity: section.capacity, waitCount, waitCap, label };
}

// Picks the term a student most likely wants to browse:
// 1. one whose registration window is open now
// 2. otherwise the next one to start
// 3. otherwise the most recent one
export function defaultTermId(terms, now = new Date()) {
  if (!terms?.length) return '';
  const t = (d) => new Date(d).getTime();
  const at = now.getTime();

  const registering = terms.find((x) => t(x.registrationOpens) <= at && at <= t(x.registrationCloses));
  if (registering) return registering._id;

  const upcoming = terms
    .filter((x) => t(x.startDate) > at)
    .sort((a, b) => t(a.startDate) - t(b.startDate));
  if (upcoming.length) return upcoming[0]._id;

  return [...terms].sort((a, b) => t(b.startDate) - t(a.startDate))[0]._id;
}

// URL search params without empty values or the default page 1, all as strings
export function cleanParams(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([k, v]) => v !== '' && v !== undefined && v !== null && !(k === 'page' && Number(v) === 1))
      .map(([k, v]) => [k, String(v)])
  );
}

// "COP 4331" / "cop4331" -> "COP4331"
export const normalizeCode = (s) => s.replace(/\s+/g, '').toUpperCase();
