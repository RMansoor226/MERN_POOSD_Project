import * as api from '../api.js';
import { useApi } from '../hooks/useApi.js';
import { RESOURCES } from './resources.js';

// Loads every record of the referenced collections (for dropdowns and pickers).
// -> { status, error, reload, options: { departments: [{ value, label }], ... } }
export function useRefOptions(refKeys) {
  const keys = [...new Set(refKeys)].sort();
  const result = useApi(
    keys.length
      ? async (token) => {
          const lists = await Promise.all(keys.map((k) => api.getAllResource(RESOURCES[k].path, token)));
          return Object.fromEntries(
            keys.map((k, i) => [
              k,
              lists[i]
                .map((doc) => ({ value: String(doc._id), label: RESOURCES[k].label(doc) }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            ])
          );
        }
      : null,
    [keys.join(',')]
  );
  return { ...result, options: result.data ?? {} };
}
