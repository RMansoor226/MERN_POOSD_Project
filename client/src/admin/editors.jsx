// Input widgets for the complex admin fields: multi-select references, section meeting
// times, the prerequisite AND/OR tree, and program requirements.

const DAYS = [
  ['M', 'Mon'],
  ['T', 'Tue'],
  ['W', 'Wed'],
  ['R', 'Thu'],
  ['F', 'Fri'],
  ['S', 'Sat'],
  ['U', 'Sun'],
];
const GRADES = ['A', 'B', 'C', 'D'];
const MAX_DEPTH = 3;

// Chips for the chosen records plus an "Add…" dropdown of the rest.
export function RefMultiPicker({ id, label, value, options, onChange }) {
  const byId = Object.fromEntries(options.map((o) => [o.value, o.label]));
  const remaining = options.filter((o) => !value.includes(o.value));

  return (
    <div className="ref-multi">
      {value.length > 0 && (
        <ul className="chip-list" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map((v) => (
            <li key={v} className="chip">
              <span>{byId[v] ?? 'Unknown record'}</span>
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${byId[v] ?? 'record'}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <select
        id={id}
        value=""
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
        disabled={remaining.length === 0}
      >
        <option value="">{remaining.length ? `Add ${label.toLowerCase()}…` : 'Nothing left to add'}</option>
        {remaining.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- meetings -------------------------------------------------------------------

const blankMeeting = () => ({ days: [], start: '', end: '', building: '', room: '' });

export function MeetingsEditor({ value, onChange }) {
  const update = (i, changes) => onChange(value.map((m, j) => (j === i ? { ...m, ...changes } : m)));
  const toggleDay = (i, day) => {
    const days = value[i].days.includes(day) ? value[i].days.filter((d) => d !== day) : [...value[i].days, day];
    // keep the canonical M T W R F S U order
    update(i, { days: DAYS.map(([d]) => d).filter((d) => days.includes(d)) });
  };

  return (
    <div className="repeat-list">
      {value.length === 0 && <p className="hint">No meeting times (online or TBA).</p>}
      {value.map((m, i) => (
        <fieldset key={i} className="repeat-row">
          <legend>Meeting {i + 1}</legend>
          <div className="day-picker" role="group" aria-label={`Meeting ${i + 1} days`}>
            {DAYS.map(([d, full]) => (
              <label key={d} className={`day-toggle ${m.days.includes(d) ? 'is-on' : ''}`}>
                <input type="checkbox" aria-label={full} checked={m.days.includes(d)} onChange={() => toggleDay(i, d)} />
                <span aria-hidden="true">{d}</span>
              </label>
            ))}
          </div>
          <div className="form-grid">
            <div className="form-field half">
              <label htmlFor={`m${i}-start`}>Starts</label>
              <input id={`m${i}-start`} type="time" value={m.start} onChange={(e) => update(i, { start: e.target.value })} />
            </div>
            <div className="form-field half">
              <label htmlFor={`m${i}-end`}>Ends</label>
              <input id={`m${i}-end`} type="time" value={m.end} onChange={(e) => update(i, { end: e.target.value })} />
            </div>
            <div className="form-field half">
              <label htmlFor={`m${i}-building`}>Building</label>
              <input id={`m${i}-building`} value={m.building} onChange={(e) => update(i, { building: e.target.value })} />
            </div>
            <div className="form-field half">
              <label htmlFor={`m${i}-room`}>Room</label>
              <input id={`m${i}-room`} value={m.room} onChange={(e) => update(i, { room: e.target.value })} />
            </div>
          </div>
          <button type="button" className="btn-text" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            Remove meeting {i + 1}
          </button>
        </fieldset>
      ))}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, blankMeeting()])}>
        Add meeting time
      </button>
    </div>
  );
}

// --- prerequisite tree -------------------------------------------------------------

const blankLeaf = () => ({ courseId: '', minGrade: '', concurrentOk: false });

function PrereqLeaf({ leaf, path, courses, onChange, onRemove }) {
  const id = `prereq-${path.join('-')}`;
  return (
    <div className="prereq-leaf">
      <div className="form-field">
        <label htmlFor={`${id}-course`}>Course</label>
        <select id={`${id}-course`} value={leaf.courseId} onChange={(e) => onChange({ ...leaf, courseId: e.target.value })}>
          <option value="">Choose a course…</option>
          {courses.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field prereq-grade">
        <label htmlFor={`${id}-grade`}>Min grade</label>
        <select id={`${id}-grade`} value={leaf.minGrade} onChange={(e) => onChange({ ...leaf, minGrade: e.target.value })}>
          <option value="">Any</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={leaf.concurrentOk}
          onChange={(e) => onChange({ ...leaf, concurrentOk: e.target.checked })}
        />
        Can take at the same time
      </label>
      <button type="button" className="btn-text" aria-label="Remove this course" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function PrereqGroup({ group, path, courses, onChange, onRemove }) {
  const depth = path.length;
  const setItem = (i, item) => onChange({ ...group, items: group.items.map((x, j) => (j === i ? item : x)) });
  const removeItem = (i) => onChange({ ...group, items: group.items.filter((_, j) => j !== i) });

  return (
    <div className={`prereq-group ${group.op === 'OR' ? 'is-or' : 'is-and'}`}>
      <div className="prereq-group-head">
        <label htmlFor={`prereq-op-${path.join('-')}`} className="visually-hidden">
          {depth === 0 ? 'Students need' : 'This group needs'}
        </label>
        <select
          id={`prereq-op-${path.join('-')}`}
          className="prereq-op"
          value={group.op}
          onChange={(e) => onChange({ ...group, op: e.target.value })}
        >
          <option value="AND">All of these (AND)</option>
          <option value="OR">Any one of these (OR)</option>
        </select>
        {onRemove && (
          <button type="button" className="btn-text" onClick={onRemove}>
            Remove group
          </button>
        )}
      </div>

      {group.items.length === 0 && <p className="hint">Empty group — add a course or remove it.</p>}
      {group.items.map((item, i) =>
        item.op ? (
          <PrereqGroup
            key={i}
            group={item}
            path={[...path, i]}
            courses={courses}
            onChange={(g) => setItem(i, g)}
            onRemove={() => removeItem(i)}
          />
        ) : (
          <PrereqLeaf
            key={i}
            leaf={item}
            path={[...path, i]}
            courses={courses}
            onChange={(l) => setItem(i, l)}
            onRemove={() => removeItem(i)}
          />
        )
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={() => onChange({ ...group, items: [...group.items, blankLeaf()] })}>
          Add course
        </button>
        {depth < MAX_DEPTH && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              onChange({ ...group, items: [...group.items, { op: group.op === 'AND' ? 'OR' : 'AND', items: [blankLeaf()] }] })
            }
          >
            Add group
          </button>
        )}
      </div>
    </div>
  );
}

export function PrereqEditor({ value, courses, onChange }) {
  if (!value) {
    return (
      <div className="repeat-list">
        <p className="hint">No course prerequisites.</p>
        <button type="button" className="btn-secondary" onClick={() => onChange({ op: 'AND', items: [blankLeaf()] })}>
          Add prerequisites
        </button>
      </div>
    );
  }
  return (
    <div className="repeat-list">
      <PrereqGroup group={value} path={[]} courses={courses} onChange={onChange} />
      <button type="button" className="btn-text" onClick={() => onChange(null)}>
        Remove all prerequisites
      </button>
    </div>
  );
}

// --- program requirements --------------------------------------------------------------

const blankRequirement = () => ({
  name: '',
  rule: 'all',
  n: '',
  credits: '',
  courseIds: [],
  filter: { subject: '', minLevel: '', attribute: '' },
});

export function RequirementsEditor({ value, courses, onChange }) {
  const update = (i, changes) => onChange(value.map((r, j) => (j === i ? { ...r, ...changes } : r)));
  const updateFilter = (i, changes) => update(i, { filter: { ...value[i].filter, ...changes } });

  return (
    <div className="repeat-list">
      {value.length === 0 && <p className="hint">No requirements yet.</p>}
      {value.map((r, i) => {
        const id = `req${i}`;
        return (
          <fieldset key={i} className="repeat-row">
            <legend>{r.name.trim() || `Requirement ${i + 1}`}</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor={`${id}-name`}>Name</label>
                <input id={`${id}-name`} value={r.name} placeholder="Core" onChange={(e) => update(i, { name: e.target.value })} />
              </div>
              <div className="form-field half">
                <label htmlFor={`${id}-rule`}>Rule</label>
                <select id={`${id}-rule`} value={r.rule} onChange={(e) => update(i, { rule: e.target.value })}>
                  <option value="all">Complete all listed courses</option>
                  <option value="anyN">Choose a number of courses</option>
                  <option value="minCredits">Earn a minimum of credits</option>
                </select>
              </div>
              {r.rule === 'anyN' && (
                <div className="form-field half">
                  <label htmlFor={`${id}-n`}>How many courses</label>
                  <input id={`${id}-n`} type="number" min="1" value={r.n} onChange={(e) => update(i, { n: e.target.value })} />
                </div>
              )}
              {r.rule === 'minCredits' && (
                <div className="form-field half">
                  <label htmlFor={`${id}-credits`}>Minimum credits</label>
                  <input
                    id={`${id}-credits`}
                    type="number"
                    min="1"
                    value={r.credits}
                    onChange={(e) => update(i, { credits: e.target.value })}
                  />
                </div>
              )}
              <div className="form-field">
                <label htmlFor={`${id}-courses`}>Courses</label>
                <RefMultiPicker
                  id={`${id}-courses`}
                  label="Courses"
                  value={r.courseIds}
                  options={courses}
                  onChange={(courseIds) => update(i, { courseIds })}
                />
              </div>
            </div>
            <p className="hint">Or let any course matching a filter count:</p>
            <div className="form-grid">
              <div className="form-field third">
                <label htmlFor={`${id}-subject`}>Subject</label>
                <input
                  id={`${id}-subject`}
                  placeholder="COP"
                  value={r.filter.subject}
                  onChange={(e) => updateFilter(i, { subject: e.target.value })}
                />
              </div>
              <div className="form-field third">
                <label htmlFor={`${id}-level`}>Minimum level</label>
                <input
                  id={`${id}-level`}
                  type="number"
                  placeholder="4000"
                  value={r.filter.minLevel}
                  onChange={(e) => updateFilter(i, { minLevel: e.target.value })}
                />
              </div>
              <div className="form-field third">
                <label htmlFor={`${id}-attribute`}>Attribute</label>
                <input
                  id={`${id}-attribute`}
                  placeholder="Writing Intensive"
                  value={r.filter.attribute}
                  onChange={(e) => updateFilter(i, { attribute: e.target.value })}
                />
              </div>
            </div>
            <button type="button" className="btn-text" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Remove {r.name.trim() || `requirement ${i + 1}`}
            </button>
          </fieldset>
        );
      })}
      <button type="button" className="btn-secondary" onClick={() => onChange([...value, blankRequirement()])}>
        Add requirement
      </button>
    </div>
  );
}
