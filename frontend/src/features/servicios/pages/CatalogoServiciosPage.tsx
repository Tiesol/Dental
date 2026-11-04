import { formatearDuracion, formatearPrecio } from '@/shared/lib/formato';
import { useServicios } from '../hooks/useServicios';

// Catálogo para el paciente: el backend solo devuelve los servicios habilitados.
export function CatalogoServiciosPage() {
  const { estado } = useServicios();

  return (
    <section className="card wide">
      <h1>Servicios</h1>
      <p className="muted">Conoce los tratamientos que ofrece la clínica.</p>
      {estado.status === 'cargando' && <p className="muted">Cargando…</p>}
      {estado.status === 'error' && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.mensaje}
        </p>
      )}
      {estado.status === 'ok' && estado.servicios.length === 0 && (
        <p className="muted">Por ahora no hay servicios disponibles.</p>
      )}
      {estado.status === 'ok' && estado.servicios.length > 0 && (
        <ul className="grid-servicios">
          {estado.servicios.map((s) => (
            <li key={s.id} className="servicio" data-testid={`servicio-${s.id}`}>
              <h2>{s.nombre}</h2>
              <p>{s.descripcion}</p>
              <dl>
                <dt>Duración</dt>
                <dd>{formatearDuracion(s.duracionMin)}</dd>
                <dt>Precio</dt>
                <dd>{formatearPrecio(s.precioReferencial)}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
