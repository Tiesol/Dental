import { useState } from 'react';
import { formatearDuracion } from '@/shared/lib/formato';
import { useOdontologos } from '../hooks/useOdontologos';
import { useServiciosParaElegir } from '../hooks/useServiciosParaElegir';

// Vista del paciente: odontólogos que aceptan citas, con filtro por servicio.
export function OdontologosPage() {
  const [serviceId, setServiceId] = useState('');
  const estado = useOdontologos(serviceId || undefined);
  const { servicios } = useServiciosParaElegir();

  return (
    <section className="card wide">
      <h1>Odontólogos</h1>
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

      {estado.status === 'cargando' && <p className="muted">Cargando…</p>}
      {estado.status === 'error' && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.mensaje}
        </p>
      )}
      {estado.status === 'ok' && estado.odontologos.length === 0 && (
        <p className="muted">
          {serviceId
            ? 'Ningún odontólogo realiza este servicio por ahora.'
            : 'Por ahora no hay odontólogos disponibles.'}
        </p>
      )}
      {estado.status === 'ok' && estado.odontologos.length > 0 && (
        <ul className="grid-servicios">
          {estado.odontologos.map((d) => (
            <li key={d.id} className="servicio" data-testid={`odontologo-${d.id}`}>
              <h2>{d.nombre}</h2>
              <p>{d.especialidad}</p>
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
  );
}
