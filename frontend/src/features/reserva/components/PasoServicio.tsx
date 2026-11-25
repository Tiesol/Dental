import { useCallback } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { DentistPublicResponse, ServiceResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { useLoader } from '@/shared/hooks/useLoader';
import { formatDuration } from '@/shared/lib/format';

type Props = {
  // Si se llegó desde un odontólogo, solo se ofrecen los servicios que él realiza.
  dentist?: DentistPublicResponse | null;
  onChoose: (service: ServiceResponse) => void;
};

export function PasoServicio({ dentist, onChoose }: Props) {
  const load = useCallback(() => servicesApi.list(), []);
  const { state } = useLoader(load);
  const services =
    state.status === 'ok' && dentist
      ? state.data.filter((s) => dentist.servicios.some((own) => own.id === s.id))
      : state.status === 'ok'
        ? state.data
        : [];

  return (
    <section className="card" aria-labelledby="titulo-paso-servicio">
      <h2 id="titulo-paso-servicio">
        {dentist ? `2. Elige un servicio de ${dentist.nombre}` : '1. Elige un servicio'}
      </h2>
      {state.status === 'cargando' && <LoadingState />}
      {state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
      {state.status === 'ok' && services.length === 0 && (
        <EmptyState title="No hay servicios disponibles" />
      )}
      {state.status === 'ok' && services.length > 0 && (
        <ul className="service-list">
          {services.map((service) => (
            <li className="service" key={service.id}>
              <div className="service-text">
                <strong>{service.nombre}</strong>
                <span className="muted">
                  {service.descripcion} · {formatDuration(service.duracionMin)}
                </span>
              </div>
              <Button
                variant="secondary"
                aria-label={`Elegir ${service.nombre}`}
                onClick={() => onChoose(service)}
              >
                Elegir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
