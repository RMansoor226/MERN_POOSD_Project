// Placeholder for a dashboard section whose backend endpoint does not exist yet.
export default function ComingSoonCard({ title, description, endpoint }) {
  return (
    <section className="card card-muted">
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="hint">Waiting on backend: {endpoint}</p>
    </section>
  );
}
