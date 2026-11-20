import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useApi } from '../../hooks/useApi.js';
import { RESOURCE_KEYS, RESOURCES } from '../../admin/resources.js';
import AppLayout from '../../components/AppLayout.jsx';

// Record counts for every managed collection (limit=1 requests just read `total`).
async function loadCounts(token) {
  const counts = await Promise.all(
    RESOURCE_KEYS.map(async (key) => {
      const r = RESOURCES[key];
      if (r.paginated === false) return (await api.listUsers(token)).length;
      return (await api.listResource(r.path, { limit: 1 }, token)).total;
    })
  );
  return Object.fromEntries(RESOURCE_KEYS.map((k, i) => [k, counts[i]]));
}

// Tiles linking to each admin list. Rendered on /admin and on an admin's home page.
export function AdminTiles() {
  const counts = useApi(loadCounts, []);

  return (
    <>
      {counts.status === 'error' && (
        <p className="alert alert-error" role="alert">
          Could not load record counts: {counts.error}
        </p>
      )}
      <ul className="admin-tiles">
        {RESOURCE_KEYS.map((key) => (
          <li key={key}>
            <Link to={`/admin/${key}`} className="card admin-tile">
              <span className="admin-tile-count">{counts.data ? counts.data[key] : '–'}</span>
              <span className="admin-tile-title">{RESOURCES[key].title}</span>
              <span className="hint">Manage {RESOURCES[key].title.toLowerCase()} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function AdminHome() {
  return (
    <AppLayout>
      <h1>Admin</h1>
      <AdminTiles />
    </AppLayout>
  );
}
