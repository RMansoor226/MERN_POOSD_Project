// Error banner with a retry button, for anything loaded through useApi.
export default function LoadError({ message, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <p>{message}</p>
      <button type="button" className="btn-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
