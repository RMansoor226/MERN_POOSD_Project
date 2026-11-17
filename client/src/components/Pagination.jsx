// "Showing 21–40 of 53" with Previous / Next buttons. Renders nothing for an empty list.
export default function Pagination({ page, limit, total, noun = 'results', onPageChange }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  const first = (page - 1) * limit + 1;
  const last = Math.min(total, page * limit);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="hint" aria-live="polite">
        Showing {first}–{last} of {total} {noun}
      </span>
      {pages > 1 && (
        <div className="pagination-buttons">
          <button type="button" className="btn-secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span className="hint">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
