import { useCallback } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse } from '@/api/types';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { useCarga } from '@/shared/hooks/useCarga';
import { formatearDuracion } from '@/shared/lib/formato';

type Props = { onElegir: (servicio: ServiceResponse) => void };

export function PasoServicio({ onElegir }: Props) {
  const cargar = useCallback(() => servicesApi.listar(), []);
  const { estado } = useCarga(cargar);

  return (
    <section className="card" aria-labelledby="titulo-paso-servicio">
      <h2 id="titulo-paso-servicio">1. Elige un servicio</h2>
      {estado.status === 'cargando' && <LoadingState />}
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {estado.status === 'ok' && estado.datos.length === 0 && (
        <EmptyState title="No hay servicios disponibles" />
      )}
      {estado.status === 'ok' && estado.datos.length > 0 && (
        <ul className="service-list">
          {estado.datos.map((servicio) => (
            <li className="service" key={servicio.id}>
              <div className="service-text">
                <strong>{servicio.nombre}</strong>
                <span className="muted">
                  {servicio.descripcion} · {formatearDuracion(servicio.duracionMin)}
                </span>
              </div>
              <button
                type="button"
                className="secondary"
                aria-label={`Elegir ${servicio.nombre}`}
                onClick={() => onElegir(servicio)}
              >
                Elegir
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
