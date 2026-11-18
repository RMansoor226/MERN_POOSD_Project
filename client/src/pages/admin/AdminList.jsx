import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import * as api from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { cleanParams } from '../../format.js';
import { RESOURCES } from '../../admin/resources.js';
import { useRefOptions } from '../../admin/useRefOptions.js';
import AppLayout from '../../components/AppLayout.jsx';
import LoadError from '../../components/LoadError.jsx';
import Pagination from '../../components/Pagination.jsx';

export const ADMIN_PAGE_SIZE = 25;

// Users come back as one plain array, so search, filters and paging happen here.
function localPage(all, { q, filters, page, config }) {
  const needle = q.trim().toLowerCase();
  const items = all.filter(
    (doc) =>
      (!needle || config.search(doc).toLowerCase().includes(needle)) &&
      Object.entries(filters).every(([k, v]) => !v || String(doc[k]) === v)
  );
  const start = (page - 1) * ADMIN_PAGE_SIZE;
  return { items: items.slice(start, start + ADMIN_PAGE_SIZE), total: items.length, page, limit: ADMIN_PAGE_SIZE };
}

function DeleteCell({ doc, config, onDeleted }) {
  const { session, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = config.label(doc);

  if (config.canDelete && !config.canDelete(doc, session)) {
    return <span className="hint">That's you</span>;
  }

  if (!confirming) {
    return (
      <button type="button" className="btn-text" aria-label={`Delete ${label}`} onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await api.deleteResource(config.path, doc._id, session.token);
      onDeleted(label);
    } catch (err) {
      if (err.status === 401) return signOut();
      setError(err.message); // e.g. 409 "Term still has sections"
      setBusy(false);
    }
  };

  return (
    <div className="row-confirm" role="group" aria-label={`Confirm deleting ${label}`}>
      <span>Delete?</span>
      <button type="button" className="btn-danger btn-small" onClick={remove} disabled={busy}>
        {busy ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" className="btn-secondary btn-small" onClick={() => setConfirming(false)} disabled={busy}>
        Keep
      </button>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AdminList() {
  const { resource } = useParams();
  const config = RESOURCES[resource];
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filterDefs = config?.filters ?? [];
  const filters = Object.fromEntries(filterDefs.map((f) => [f.name, params.get(f.name) ?? '']));
  const filterKey = JSON.stringify(filters);

  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  // success message handed over by the form page, or set after a delete
  const [flash, setFlash] = useState(location.state?.flash ?? '');
  useEffect(() => {
    if (location.state?.flash) {
      setFlash(location.state.flash);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null }); // don't replay on refresh
    }
  }, [location, navigate]);

  const refs = useRefOptions(filterDefs.filter((f) => f.ref).map((f) => f.ref));

  const list = useApi(
    config
      ? async (token) =>
          config.paginated === false
            ? localPage(await api.listUsers(token), { q, filters, page, config })
            : api.listResource(config.path, { q, ...filters, page, limit: ADMIN_PAGE_SIZE }, token)
      : null,
    [resource, q, filterKey, page]
  );

  if (!config) return <Navigate to="/admin" replace />;

  const update = (changes) => setParams(cleanParams({ q, ...filters, page: '', ...changes }));
  const data = list.data;
  const canCreate = config.canCreate !== false;
  const hasToolbar = config.searchable || config.search || filterDefs.length > 0;

  return (
    <AppLayout>
      <p className="breadcrumb">
        <Link to="/admin">← Admin</Link>
      </p>
      <div className="page-head">
        <h1>{config.title}</h1>
        {canCreate && (
          <Link to={`/admin/${resource}/new`} className="btn-link">
            New {config.singular}
          </Link>
        )}
      </div>
      {config.note && <p className="hint admin-note">{config.note}</p>}

      {flash && (
        <p className="alert alert-success" role="status">
          {flash}
        </p>
      )}

      {hasToolbar && (
        <form
          className="filters"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: draft.trim() });
          }}
        >
          {(config.searchable || config.search) && (
            <div className="filter-field filter-grow">
              <label htmlFor="admin-q">Search</label>
              <input id="admin-q" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} />
            </div>
          )}
          {filterDefs.map((f) => (
            <div key={f.name} className="filter-field">
              <label htmlFor={`admin-filter-${f.name}`}>{f.label}</label>
              <select
                id={`admin-filter-${f.name}`}
                value={filters[f.name]}
                onChange={(e) => update({ [f.name]: e.target.value })}
              >
                <option value="">All</option>
                {(f.ref ? refs.options[f.ref] ?? [] : f.options).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {(config.searchable || config.search) && (
            <button type="submit" className="filter-submit">
              Search
            </button>
          )}
        </form>
      )}

      {list.status === 'error' && <LoadError message={list.error} onRetry={list.reload} />}
      {list.status === 'loading' && !data && <p role="status">Loading {config.title.toLowerCase()}…</p>}

      {data && (
        <div aria-busy={list.status === 'loading'}>
          {data.items.length === 0 ? (
            <p className="card">No {config.title.toLowerCase()} found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table admin-table">
                <caption className="visually-hidden">{config.title}</caption>
                <thead>
                  <tr>
                    {config.columns.map((c) => (
                      <th key={c.label} scope="col">
                        {c.label}
                      </th>
                    ))}
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((doc) => (
                    <tr key={doc._id}>
                      {config.columns.map((c) => (
                        <td key={c.label} className={c.mono ? 'mono' : undefined}>
                          {c.render(doc)}
                        </td>
                      ))}
                      <td className="row-actions">
                        <Link to={`/admin/${resource}/${doc._id}`} aria-label={`Edit ${config.label(doc)}`}>
                          Edit
                        </Link>
                        <DeleteCell
                          doc={doc}
                          config={config}
                          onDeleted={(label) => {
                            setFlash(`Deleted ${label}.`);
                            list.reload();
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            noun={config.title.toLowerCase()}
            onPageChange={(p) => update({ page: p })}
          />
        </div>
      )}
    </AppLayout>
  );
}
