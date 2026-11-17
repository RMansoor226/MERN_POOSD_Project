import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { cleanParams, defaultTermId, formatDate, MODALITY_LABELS, normalizeCode } from '../format.js';
import AppLayout from '../components/AppLayout.jsx';
import LoadError from '../components/LoadError.jsx';
import Pagination from '../components/Pagination.jsx';
import SectionTable from '../components/SectionTable.jsx';

export const SECTIONS_PER_PAGE = 25;

// GET /api/sections only filters by courseId, so a typed course is turned into an id first.
// Returns { courseId } on a match, or { matches } (codes) when the text is ambiguous or matches nothing.
async function resolveCourse(text, token) {
  const looksLikeCode = /^[a-z]{2,4}\s*\d/i.test(text);
  const { items } = await api.getCourses({ q: looksLikeCode ? normalizeCode(text) : text, limit: 100 }, token);
  const exact = items.find((c) => normalizeCode(c.code) === normalizeCode(text));
  if (exact) return { courseId: exact._id };
  if (items.length === 1) return { courseId: items[0]._id };
  return { matches: items.map((c) => c.code) };
}

// Find sections in a term, optionally narrowed by course, status and delivery mode.
// Filters live in the URL (?term=&course=&status=&modality=&page=).
export default function ClassSearch() {
  const [params, setParams] = useSearchParams();
  const course = params.get('course') ?? '';
  const status = params.get('status') ?? '';
  const modality = params.get('modality') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const terms = useApi((token) => api.getTerms(token), []);
  const termId = params.get('term') || defaultTermId(terms.data);
  const term = terms.data?.find((t) => t._id === termId);

  const [draft, setDraft] = useState(course);
  useEffect(() => setDraft(course), [course]);

  const results = useApi(
    termId
      ? async (token) => {
          let courseId;
          if (course) {
            const resolved = await resolveCourse(course, token);
            if (!resolved.courseId) return { unmatched: resolved.matches };
            courseId = resolved.courseId;
          }
          return api.getSections({ termId, courseId, status, modality, page, limit: SECTIONS_PER_PAGE }, token);
        }
      : null,
    [termId, course, status, modality, page]
  );

  const update = (changes) =>
    setParams(cleanParams({ term: params.get('term') ?? '', course, status, modality, page: '', ...changes }));

  const data = results.data;

  return (
    <AppLayout>
      <h1>Class Search</h1>

      {terms.status === 'error' && <LoadError message={terms.error} onRetry={terms.reload} />}
      {terms.status === 'loading' && <p role="status">Loading terms…</p>}
      {terms.status === 'ready' && terms.data.length === 0 && <p className="card">No terms have been scheduled yet.</p>}

      {terms.data?.length > 0 && (
        <>
          <form
            className="filters"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ course: draft.trim() });
            }}
          >
            <div className="filter-field">
              <label htmlFor="class-term">Term</label>
              <select id="class-term" value={termId} onChange={(e) => update({ term: e.target.value })}>
                {terms.data.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-field filter-grow">
              <label htmlFor="class-course">Course</label>
              <input
                id="class-course"
                type="search"
                placeholder="e.g. COP4331 (leave blank for all)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="class-status">Status</label>
              <select id="class-status" value={status} onChange={(e) => update({ status: e.target.value })}>
                <option value="">Any status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-field">
              <label htmlFor="class-modality">Mode</label>
              <select id="class-modality" value={modality} onChange={(e) => update({ modality: e.target.value })}>
                <option value="">Any mode</option>
                {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="filter-submit">
              Search
            </button>
          </form>

          {term && (
            <p className="hint term-dates">
              {term.name} runs {formatDate(term.startDate)} – {formatDate(term.endDate)}. Registration{' '}
              {formatDate(term.registrationOpens)} – {formatDate(term.registrationCloses)}.
            </p>
          )}
        </>
      )}

      {results.status === 'error' && <LoadError message={results.error} onRetry={results.reload} />}
      {results.status === 'loading' && !data && <p role="status">Searching…</p>}

      {data?.unmatched && (
        <p className="card" role="status">
          {data.unmatched.length === 0
            ? `No course matches “${course}”.`
            : `“${course}” matches several courses: ${data.unmatched.slice(0, 10).join(', ')}${
                data.unmatched.length > 10 ? ', …' : ''
              }. Enter one course code.`}
        </p>
      )}

      {data?.items && (
        <div aria-busy={results.status === 'loading'}>
          {data.items.length === 0 ? (
            <p className="card">No sections match these filters.</p>
          ) : (
            <SectionTable sections={data.items} showCourse caption={`Sections for ${term?.name ?? 'the selected term'}`} />
          )}
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun="sections"
            onPageChange={(p) => update({ page: p })}
          />
        </div>
      )}
    </AppLayout>
  );
}
