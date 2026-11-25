import { ButtonLink } from '@/shared/components/ButtonLink';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { Icon } from '@/shared/components/Icon';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatDuration, formatPrice } from '@/shared/lib/format';
import { useServices } from '../hooks/useServices';

// Catálogo para el paciente: el backend solo devuelve los servicios habilitados.
export function CatalogoServiciosPage() {
  const { state } = useServices();

  return (
    <div className="page">
      <PageHeader title="Servicios" description="Conoce los tratamientos que ofrece la clínica." />
      {state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
      {state.status !== 'error' && (
        <section className="card card-flush">
          {state.status === 'cargando' && <LoadingState />}
          {state.status === 'ok' && state.services.length === 0 && (
            <EmptyState title="Por ahora no hay servicios disponibles" />
          )}
          {state.status === 'ok' && state.services.length > 0 && (
            <ul className="service-list">
              {state.services.map((s) => (
                <li
                  key={s.id}
                  className="service service-con-accion"
                  data-testid={`servicio-${s.id}`}
                >
                  <div className="service-text">
                    <h2>{s.nombre}</h2>
                    <p className="muted">{s.descripcion}</p>
                  </div>
                  <dl className="service-meta">
                    <div>
                      <dt>Duración</dt>
                      <dd>
                        <Icon name="clock" />
                        {formatDuration(s.duracionMin)}
                      </dd>
                    </div>
                    <div>
                      <dt>Precio</dt>
                      <dd>
                        <Icon name="tag" />
                        {formatPrice(s.precioReferencial)}
                      </dd>
                    </div>
                  </dl>
                  <ButtonLink
                    variant="secondary"
                    to={`/reservar?servicio=${s.id}`}
                    aria-label={`Reservar ${s.nombre}`}
                  >
                    Reservar
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
