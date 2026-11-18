import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import AppLayout from '../components/AppLayout.jsx';
import LoadError from '../components/LoadError.jsx';
import SectionTable from '../components/SectionTable.jsx';
import { useRegistration } from '../components/Registration.jsx';

// Every course id referenced by a prereq tree ({ op, items } groups and { courseId } leaves).
function prereqIds(node) {
  if (!node) return [];
  if (node.courseId) return [String(node.courseId)];
  return (node.items ?? []).flatMap(prereqIds);
}

// The course plus a { courseId: course } lookup for its prereqs and coreqs,
// since the backend stores those as bare ids.
async function loadCourse(id, token) {
  const course = await api.getCourse(id, token);
  const ids = [...new Set([...prereqIds(course.prereqs), ...(course.coreqs ?? []).map(String)])];
  const related = await Promise.all(
    ids.map((cid) =>
      api.getCourse(cid, token).catch((err) => {
        if (err.status === 401) throw err; // let useApi log the user out
        return null; // a deleted course shouldn't break the page
      })
    )
  );
  const lookup = Object.fromEntries(related.filter(Boolean).map((c) => [String(c._id), c]));
  return { course, lookup };
}

// Sections of this course grouped by term, newest term first.
async function loadSections(courseId, token) {
  const [terms, sections] = await Promise.all([api.getTerms(token), api.getAllSections({ courseId }, token)]);
  return terms
    .map((term) => ({ term, sections: sections.filter((s) => String(s.termId?._id ?? s.termId) === String(term._id)) }))
    .filter((g) => g.sections.length > 0);
}

function CourseRef({ id, lookup }) {
  const c = lookup[String(id)];
  return c ? <Link to={`/catalog/${c._id}`}>{c.code}</Link> : <span>Unknown course</span>;
}

// Renders a prereq tree as a sentence: "COP3503 (C or better) and COT3100".
// Nested groups get parentheses.
function PrereqTree({ node, lookup, nested = false }) {
  if (node.courseId) {
    const notes = [
      node.minGrade && `${node.minGrade} or better`,
      node.concurrentOk && 'may be taken concurrently',
    ].filter(Boolean);
    return (
      <>
        <CourseRef id={node.courseId} lookup={lookup} />
        {notes.length > 0 && <span className="hint"> ({notes.join('; ')})</span>}
      </>
    );
  }

  const joiner = node.op === 'OR' ? ' or ' : ' and ';
  const parts = node.items.map((item, i) => (
    <Fragment key={i}>
      {i > 0 && <strong>{joiner}</strong>}
      <PrereqTree node={item} lookup={lookup} nested />
    </Fragment>
  ));
  return nested && node.items.length > 1 ? <>({parts})</> : <>{parts}</>;
}

export default function CourseDetail() {
  const { id } = useParams();
  const detail = useApi((token) => loadCourse(id, token), [id]);
  const sections = useApi((token) => loadSections(id, token), [id]);
  const registration = useRegistration(() => sections.reload());

  const course = detail.data?.course;
  const lookup = detail.data?.lookup ?? {};
  const hasPrereqs = Boolean(course?.prereqs) || Boolean(course?.prereqText);

  return (
    <AppLayout>
      <p className="breadcrumb">
        <Link to="/catalog">← Course Catalog</Link>
      </p>

      {detail.status === 'error' && <LoadError message={detail.error} onRetry={detail.reload} />}
      {detail.status === 'loading' && !course && <p role="status">Loading course…</p>}

      {course && (
        <>
          <h1>
            {course.code}: {course.title}
          </h1>

          <section className="card" aria-labelledby="course-info-heading">
            <h2 id="course-info-heading">Course Information</h2>
            <dl className="details">
              <div>
                <dt>Credits</dt>
                <dd>{course.credits}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{course.departmentId?.name ?? '—'}</dd>
              </div>
              {course.attributes?.length > 0 && (
                <div>
                  <dt>Attributes</dt>
                  <dd>{course.attributes.join(', ')}</dd>
                </div>
              )}
            </dl>
            {course.description && <p className="course-desc">{course.description}</p>}

            <h3>Prerequisites</h3>
            {hasPrereqs ? (
              <p>
                {course.prereqs && <PrereqTree node={course.prereqs} lookup={lookup} />}
                {course.prereqs && course.prereqText && <strong> and </strong>}
                {course.prereqText}
              </p>
            ) : (
              <p className="hint">None</p>
            )}

            {course.coreqs?.length > 0 && (
              <>
                <h3>Corequisites</h3>
                <p>
                  {course.coreqs.map((cid, i) => (
                    <Fragment key={String(cid)}>
                      {i > 0 && ', '}
                      <CourseRef id={cid} lookup={lookup} />
                    </Fragment>
                  ))}
                </p>
              </>
            )}
          </section>

          <section className="section-block" aria-labelledby="course-sections-heading">
            <div className="section-block-head">
              <h2 id="course-sections-heading">Sections</h2>
              <Link to={`/classes?course=${encodeURIComponent(course.code)}`}>Search classes for {course.code} →</Link>
            </div>
            {registration.banner}
            {sections.status === 'error' && <LoadError message={sections.error} onRetry={sections.reload} />}
            {sections.status === 'loading' && !sections.data && <p role="status">Loading sections…</p>}
            {sections.data?.length === 0 && <p className="hint">This course has no scheduled sections.</p>}
            {sections.data?.map(({ term, sections: list }) => (
              <div key={term._id} className="term-group">
                <h3>{term.name}</h3>
                <SectionTable
                  sections={list}
                  caption={`${course.code} sections, ${term.name}`}
                  action={registration.action && ((s) => registration.action(s, term))}
                  actionLabel="Register"
                />
              </div>
            ))}
          </section>
        </>
      )}
    </AppLayout>
  );
}
