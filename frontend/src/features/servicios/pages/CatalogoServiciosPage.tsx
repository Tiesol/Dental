import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatearDuracion, formatearPrecio } from '@/shared/lib/formato';
import { useServicios } from '../hooks/useServicios';

// Catálogo para el paciente: el backend solo devuelve los servicios habilitados.
export function CatalogoServiciosPage() {
  const { estado } = useServicios();

  return (
    <div className="page">
      <PageHeader title="Servicios" description="Conoce los tratamientos que ofrece la clínica." />
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {estado.status !== 'error' && (
        <section className="card card-flush">
          {estado.status === 'cargando' && <LoadingState />}
          {estado.status === 'ok' && estado.servicios.length === 0 && (
            <EmptyState title="Por ahora no hay servicios disponibles" />
          )}
          {estado.status === 'ok' && estado.servicios.length > 0 && (
            <ul className="service-list">
              {estado.servicios.map((s) => (
                <li key={s.id} className="service" data-testid={`servicio-${s.id}`}>
                  <div className="service-text">
                    <h2>{s.nombre}</h2>
                    <p className="muted">{s.descripcion}</p>
                  </div>
                  <dl className="service-meta">
                    <div>
                      <dt>Duración</dt>
                      <dd>
                        <Icon name="clock" />
                        {formatearDuracion(s.duracionMin)}
                      </dd>
                    </div>
                    <div>
                      <dt>Precio</dt>
                      <dd>
                        <Icon name="tag" />
                        {formatearPrecio(s.precioReferencial)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
