export function LoadingState() {
  return (
    <div className="loading" role="status" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
    </div>
  );
}
