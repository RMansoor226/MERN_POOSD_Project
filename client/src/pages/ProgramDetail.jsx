import { Link, useParams } from 'react-router-dom';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { describeFilter, describeRule, matchesFilter, plural } from '../format.js';
import AppLayout from '../components/AppLayout.jsx';
import LoadError from '../components/LoadError.jsx';

const hasFilter = (req) => Boolean(req.filter && (req.filter.subject || req.filter.minLevel || req.filter.attribute));

// 404s for a deleted course/department shouldn't break the page; an expired token should.
const soft = (promise) =>
  promise.catch((err) => {
    if (err.status === 401) throw err;
    return null;
  });

// The program plus everything needed to show it: requirement courses are stored as bare
// ids, filter-based requirements need a catalog lookup, and departmentId isn't populated.
async function loadProgram(id, token) {
  const program = await api.getProgram(id, token);
  const reqs = program.requirements ?? [];
  const ids = [...new Set(reqs.flatMap((r) => (r.courseIds ?? []).map(String)))];

  const [courses, filterMatches, departments] = await Promise.all([
    Promise.all(ids.map((cid) => soft(api.getCourse(cid, token)))),
    // the backend filters subject/attribute; level is checked here
    Promise.all(
      reqs.map((r) =>
        hasFilter(r)
          ? soft(
              api.getAllCourses({ subject: r.filter.subject || undefined, attribute: r.filter.attribute || undefined }, token)
            ).then((list) => (list ?? []).filter((c) => matchesFilter(c, r.filter)))
          : null
      )
    ),
    program.departmentId ? soft(api.getDepartments(token)) : null,
  ]);

  const lookup = Object.fromEntries(courses.filter(Boolean).map((c) => [String(c._id), c]));
  const department = departments?.find((d) => String(d._id) === String(program.departmentId)) ?? null;
  return { program, lookup, filterMatches, department };
}

function CourseRows({ courses }) {
  return (
    <ul className="req-courses">
      {courses.map((c) => (
        <li key={c._id}>
          <Link to={`/catalog/${c._id}`} className="course-code">
            {c.code}
          </Link>
          <span className="req-course-title">{c.title}</span>
          <span className="hint">{plural(c.credits, 'credit')}</span>
        </li>
      ))}
    </ul>
  );
}

function Requirement({ req, index, lookup, matches }) {
  const ids = (req.courseIds ?? []).map(String);
  const listed = ids.map((cid) => lookup[cid]).filter(Boolean);
  const missing = ids.length - listed.length;
  const listedCredits = listed.reduce((sum, c) => sum + (c.credits ?? 0), 0);

  return (
    <section className="card req-card" aria-labelledby={`req-${index}`}>
      <div className="req-head">
        <h2 id={`req-${index}`}>{req.name}</h2>
        <span className="tag">{describeRule(req)}</span>
      </div>

      {listed.length > 0 && (
        <>
          {req.rule === 'all' && <p className="hint">{plural(listedCredits, 'credit')} total</p>}
          {req.rule !== 'all' && <p className="hint">From these courses:</p>}
          <CourseRows courses={listed} />
        </>
      )}
      {missing > 0 && <p className="hint">{plural(missing, 'listed course')} could not be found in the catalog.</p>}

      {hasFilter(req) && (
        <>
          <p className="req-filter">
            {listed.length > 0 ? 'Or ' : 'From '}
            {describeFilter(req.filter)}.
          </p>
          {matches?.length > 0 ? (
            <>
              <p className="hint">Courses in the catalog that qualify:</p>
              <CourseRows courses={matches} />
            </>
          ) : (
            <p className="hint">No courses in the catalog match this yet.</p>
          )}
        </>
      )}
    </section>
  );
}

export default function ProgramDetail() {
  const { id } = useParams();
  const detail = useApi((token) => loadProgram(id, token), [id]);
  const data = detail.data;
  const program = data?.program;

  return (
    <AppLayout>
      <p className="breadcrumb">
        <Link to="/programs">← Programs</Link>
      </p>

      {detail.status === 'error' && <LoadError message={detail.error} onRetry={detail.reload} />}
      {detail.status === 'loading' && !program && <p role="status">Loading program…</p>}

      {program && (
        <>
          <h1>{program.name}</h1>

          <section className="card" aria-labelledby="program-info-heading">
            <h2 id="program-info-heading">Program Information</h2>
            <dl className="details">
              <div>
                <dt>Type</dt>
                <dd className="capitalize">{[program.degree, program.type].filter(Boolean).join(' ')}</dd>
              </div>
              <div>
                <dt>Catalog year</dt>
                <dd>{program.catalogYear}</dd>
              </div>
              {program.totalCredits != null && (
                <div>
                  <dt>Total credits</dt>
                  <dd>{program.totalCredits}</dd>
                </div>
              )}
              {data.department && (
                <div>
                  <dt>Department</dt>
                  <dd>{data.department.name}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="section-block" aria-labelledby="requirements-heading">
            <h2 id="requirements-heading">Requirements</h2>
            {program.requirements?.length ? (
              <div className="req-list">
                {program.requirements.map((req, i) => (
                  <Requirement key={req._id ?? i} index={i} req={req} lookup={data.lookup} matches={data.filterMatches[i]} />
                ))}
              </div>
            ) : (
              <p className="hint">This program has no requirements listed yet.</p>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
