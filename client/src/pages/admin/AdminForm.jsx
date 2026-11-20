import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import * as api from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { RESOURCES } from '../../admin/resources.js';
import { check, detailsByField, emptyForm, toBody, toForm } from '../../admin/fieldTypes.js';
import { useRefOptions } from '../../admin/useRefOptions.js';
import { MeetingsEditor, PrereqEditor, RefMultiPicker, RequirementsEditor } from '../../admin/editors.jsx';
import AppLayout from '../../components/AppLayout.jsx';
import LoadError from '../../components/LoadError.jsx';

// Which collections a form needs for its dropdowns and pickers
function refsFor(fields) {
  const refs = fields.filter((f) => f.ref).map((f) => f.ref);
  if (fields.some((f) => f.type === 'prereqs' || f.type === 'requirements')) refs.push('courses');
  return refs;
}

function Field({ field, value, onChange, error, options, editing, selfId }) {
  const id = `field-${field.name}`;
  const locked = editing && field.createOnly;
  const errorId = error ? `${id}-error` : undefined;
  const common = { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': errorId };
  // a course can't be its own prereq/coreq
  const courseOptions = (options.courses ?? []).filter((o) => o.value !== selfId);

  let input;
  switch (field.type) {
    case 'textarea':
      input = <textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'number':
      input = (
        <input {...common} type="number" step={field.step ?? '1'} value={value} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case 'date':
      input = <input {...common} type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'select':
    case 'ref': {
      // refWhere narrows the choices (e.g. instructor-role users) but keeps the current value visible
      const opts =
        field.type === 'ref'
          ? (options[field.ref] ?? []).filter((o) => !field.refWhere || o.value === value || field.refWhere(o.doc))
          : field.options;
      input = (
        <select {...common} value={value} disabled={locked} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.required ? `Choose ${field.label.toLowerCase()}…` : 'None'}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    }
    case 'refMulti':
      input = (
        <RefMultiPicker
          id={id}
          label={field.label}
          value={value}
          options={field.excludeSelf ? courseOptions : options[field.ref] ?? []}
          onChange={onChange}
        />
      );
      break;
    case 'meetings':
      input = <MeetingsEditor value={value} onChange={onChange} />;
      break;
    case 'prereqs':
      input = <PrereqEditor value={value} courses={courseOptions} onChange={onChange} />;
      break;
    case 'requirements':
      input = <RequirementsEditor value={value} courses={options.courses ?? []} onChange={onChange} />;
      break;
    default:
      input = (
        <input
          {...common}
          type={field.inputType ?? 'text'}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  // the complex editors label their own inputs, so they get a group heading instead
  const grouped = ['meetings', 'prereqs', 'requirements'].includes(field.type);

  return (
    <div className={`form-field ${field.half ? 'half' : ''} ${grouped ? 'form-group' : ''}`}>
      {grouped ? (
        <h2 className="form-group-title" id={id}>
          {field.label}
        </h2>
      ) : (
        <label htmlFor={id}>
          {field.label}
          {field.required && !locked && <span className="required" aria-hidden="true"> *</span>}
        </label>
      )}
      {input}
      {(locked || field.hint) && <p className="hint">{field.hint}</p>}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

// The form itself. Mounted only once its starting values are known, so an edit form
// never flashes empty before the saved record fills it in.
function RecordForm({ resource, config, id, initial, options }) {
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const fields = config.fields;

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const setValue = (name, v) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const active = fields.filter((f) => !(editing && f.createOnly));
    const found = Object.fromEntries(active.map((f) => [f.name, check(f, values[f.name])]).filter(([, m]) => m));
    if (Object.keys(found).length) {
      setErrors(found);
      setFormError('Please fix the highlighted fields.');
      return;
    }

    const body = {};
    for (const f of active) {
      const v = toBody(f, values[f.name]);
      if (v !== undefined) body[f.name] = v;
    }

    setSaving(true);
    try {
      const saved = editing
        ? await api.updateResource(config.path, id, body, session.token)
        : await api.createResource(config.path, body, session.token);
      navigate(`/admin/${resource}`, {
        state: { flash: `${editing ? 'Saved' : 'Created'} ${config.label(saved)}.` },
      });
    } catch (err) {
      if (err.status === 401) return signOut();
      const byField = detailsByField(err.details);
      setErrors(byField);
      // details for fields this form doesn't show still need to be visible
      const unshown = Object.entries(byField)
        .filter(([k]) => !fields.some((f) => f.name === k))
        .map(([k, m]) => `${k}: ${m}`);
      setFormError([err.message, ...unshown].join(' — '));
      setSaving(false);
    }
  };

  return (
    <form className="card admin-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="alert alert-error" role="alert">
          {formError}
        </p>
      )}
      <div className="form-grid">
        {fields.map((f) => (
          <Field
            key={f.name}
            field={f}
            value={values[f.name]}
            onChange={(v) => setValue(f.name, v)}
            error={errors[f.name]}
            options={options}
            editing={editing}
            selfId={id}
          />
        ))}
      </div>
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : `Create ${config.singular}`}
        </button>
        <Link to={`/admin/${resource}`} className="btn-link btn-link-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

// Loads the record (when editing) and the dropdown options, then shows the form.
export default function AdminForm() {
  const { resource, id } = useParams();
  const config = RESOURCES[resource];
  const editing = Boolean(id);

  const refs = useRefOptions(refsFor(config?.fields ?? []));
  const existing = useApi(editing && config ? (token) => api.getResource(config.path, id, token) : null, [resource, id]);

  if (!config || (!editing && config.canCreate === false)) {
    return <Navigate to={config ? `/admin/${resource}` : '/admin'} replace />;
  }

  const ready = refs.status !== 'loading' && refs.status !== 'error' && (!editing || existing.status === 'ready');
  const title = editing
    ? `Edit ${existing.data ? config.label(existing.data) : config.singular}`
    : `New ${config.singular}`;

  return (
    <AppLayout>
      <p className="breadcrumb">
        <Link to={`/admin/${resource}`}>← {config.title}</Link>
      </p>
      <h1>{title}</h1>

      {existing.status === 'error' && <LoadError message={existing.error} onRetry={existing.reload} />}
      {refs.status === 'error' && <LoadError message={refs.error} onRetry={refs.reload} />}
      {!ready && existing.status !== 'error' && refs.status !== 'error' && <p role="status">Loading…</p>}

      {ready && (
        <RecordForm
          key={`${resource}:${id ?? 'new'}`}
          resource={resource}
          config={config}
          id={id}
          options={refs.options}
          initial={
            editing
              ? Object.fromEntries(config.fields.map((f) => [f.name, toForm(f, existing.data[f.name])]))
              : emptyForm(config.fields)
          }
        />
      )}
    </AppLayout>
  );
}
