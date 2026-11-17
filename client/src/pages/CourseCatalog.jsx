import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { cleanParams } from '../format.js';
import AppLayout from '../components/AppLayout.jsx';
import LoadError from '../components/LoadError.jsx';
import Pagination from '../components/Pagination.jsx';

export const COURSES_PER_PAGE = 20;

// Browse and search every course: GET /api/courses with q (code or title) and departmentId.
// Filters live in the URL (?q=&department=&page=) so back/forward and shared links work.
export default function CourseCatalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const department = params.get('department') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // the text box is edited locally and only applied on submit
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  const departments = useApi((token) => api.getDepartments(token), []);
  const courses = useApi(
    (token) => api.getCourses({ q, departmentId: department, page, limit: COURSES_PER_PAGE }, token),
    [q, department, page]
  );

  // any filter change goes back to page 1 unless a page is given
  const update = (changes) => setParams(cleanParams({ q, department, page: '', ...changes }));

  const data = courses.data;

  return (
    <AppLayout>
      <h1>Course Catalog</h1>

      <form
        className="filters"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft.trim() });
        }}
      >
        <div className="filter-field filter-grow">
          <label htmlFor="course-q">Search</label>
          <input
            id="course-q"
            type="search"
            placeholder="Course code or title, e.g. COP4331 or Calculus"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="course-dept">Department</label>
          <select id="course-dept" value={department} onChange={(e) => update({ department: e.target.value })}>
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="filter-submit">
          Search
        </button>
      </form>

      {courses.status === 'error' && <LoadError message={courses.error} onRetry={courses.reload} />}
      {courses.status === 'loading' && !data && <p role="status">Loading courses…</p>}

      {data && (
        <div aria-busy={courses.status === 'loading'}>
          {data.items.length === 0 ? (
            <p className="card">No courses match your search.</p>
          ) : (
            <ul className="course-list">
              {data.items.map((c) => (
                <li key={c._id} className="card course-item">
                  <div className="course-item-head">
                    <Link to={`/catalog/${c._id}`} className="course-link">
                      <span className="course-code">{c.code}</span> {c.title}
                    </Link>
                    <span className="hint">
                      {c.credits} {c.credits === 1 ? 'credit' : 'credits'}
                    </span>
                  </div>
                  {c.departmentId?.name && <div className="hint">{c.departmentId.name}</div>}
                  {c.description && <p className="course-desc">{c.description}</p>}
                  {c.attributes?.length > 0 && (
                    <ul className="tag-list" aria-label="Attributes">
                      {c.attributes.map((a) => (
                        <li key={a} className="tag">
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun="courses"
            onPageChange={(p) => update({ page: p })}
          />
        </div>
      )}
    </AppLayout>
  );
}
