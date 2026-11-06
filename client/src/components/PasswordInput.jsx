import { useState } from 'react';

// Password field with a Show/Hide toggle. Takes the same props as a normal <input>.
export default function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input id={id} type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-controls={id}
        aria-pressed={visible}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
