import { useState } from 'react';
import { Avatar } from '@/shared/components/Avatar';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatearDuracion } from '@/shared/lib/formato';
import { useOdontologos } from '../hooks/useOdontologos';
import { useServiciosParaElegir } from '../hooks/useServiciosParaElegir';

// Vista del paciente: odontólogos que aceptan citas, con filtro por servicio.
export function OdontologosPage() {
  const [serviceId, setServiceId] = useState('');
  const estado = useOdontologos(serviceId || undefined);
  const { servicios } = useServiciosParaElegir();

  return (
    <div className="page">
      <PageHeader
        title="Odontólogos"
        description="Conoce a los profesionales de la clínica y los servicios que realizan."
      />
      <section className="card card-flush">
        <div className="filters">
          <label>
            Servicio
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Todos los servicios</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {estado.status === 'cargando' && <LoadingState />}
        {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
        {estado.status === 'ok' && estado.odontologos.length === 0 && (
          <EmptyState
            title={
              serviceId
                ? 'Ningún odontólogo realiza este servicio por ahora'
                : 'Por ahora no hay odontólogos disponibles'
            }
          />
        )}
        {estado.status === 'ok' && estado.odontologos.length > 0 && (
          <ul className="service-list">
            {estado.odontologos.map((d) => (
              <li key={d.id} className="service" data-testid={`odontologo-${d.id}`}>
                <div className="cell-person">
                  <Avatar name={d.nombre} />
                  <div className="service-text">
                    <h2>{d.nombre}</h2>
                    <p className="muted">{d.especialidad}</p>
                  </div>
                </div>
                {d.servicios.length > 0 ? (
                  <ul className="chips" aria-label={`Servicios de ${d.nombre}`}>
                    {d.servicios.map((s) => (
                      <li key={s.id}>
                        {s.nombre} · {formatearDuracion(s.duracionMin)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Sin servicios asignados.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
