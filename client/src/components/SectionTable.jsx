import { Link } from 'react-router-dom';
import {
  dayNames,
  formatLocation,
  formatMeetingTime,
  instructorName,
  MODALITY_LABELS,
  seatInfo,
} from '../format.js';

const STATUS_CLASS = {
  Open: 'status-open',
  Waitlist: 'status-waitlist',
  Full: 'status-full',
  Closed: 'status-full',
  Cancelled: 'status-cancelled',
};

function Meetings({ meetings }) {
  if (!meetings?.length) return <span className="hint">TBA</span>;
  return meetings.map((m, i) => (
    <div key={i}>
      <abbr title={dayNames(m.days)}>{formatMeetingTime(m)}</abbr>
      <div className="hint">{formatLocation(m)}</div>
    </div>
  ));
}

// Sections as a table. showCourse adds a Course column (class search); the course
// detail page leaves it off because every row is the same course.
export default function SectionTable({ sections, showCourse = false, caption }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">CRN</th>
            {showCourse && <th scope="col">Course</th>}
            <th scope="col">Sec</th>
            <th scope="col">Meets</th>
            <th scope="col">Instructor</th>
            <th scope="col">Mode</th>
            <th scope="col">Seats</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => {
            const seats = seatInfo(s);
            const course = s.courseId;
            return (
              <tr key={s._id}>
                <td>{s.crn}</td>
                {showCourse && (
                  <td>
                    {course?._id ? (
                      <Link to={`/catalog/${course._id}`}>{course.code}</Link>
                    ) : (
                      '—'
                    )}
                    {course?.title && <div className="hint">{course.title}</div>}
                  </td>
                )}
                <td>{s.sectionNumber}</td>
                <td>
                  <Meetings meetings={s.meetings} />
                </td>
                <td>
                  {s.instructorIds?.length ? s.instructorIds.map(instructorName).join(', ') : <span className="hint">Staff</span>}
                </td>
                <td>{MODALITY_LABELS[s.modality] ?? s.modality ?? '—'}</td>
                <td>
                  {seats.open} of {seats.capacity} open
                  {seats.waitCap > 0 && (
                    <div className="hint">
                      Waitlist {seats.waitCount}/{seats.waitCap}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${STATUS_CLASS[seats.label]}`}>{seats.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
