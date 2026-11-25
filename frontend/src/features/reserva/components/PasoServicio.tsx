import { useCallback } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { DentistPublicResponse, ServiceResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { useCarga } from '@/shared/hooks/useCarga';
import { formatearDuracion } from '@/shared/lib/formato';

type Props = {
  // Si se llegó desde un odontólogo, solo se ofrecen los servicios que él realiza.
  odontologo?: DentistPublicResponse | null;
  onElegir: (servicio: ServiceResponse) => void;
};

export function PasoServicio({ odontologo, onElegir }: Props) {
  const cargar = useCallback(() => servicesApi.listar(), []);
  const { estado } = useCarga(cargar);
  const servicios =
    estado.status === 'ok' && odontologo
      ? estado.datos.filter((s) => odontologo.servicios.some((propio) => propio.id === s.id))
      : estado.status === 'ok'
        ? estado.datos
        : [];

  return (
    <section className="card" aria-labelledby="titulo-paso-servicio">
      <h2 id="titulo-paso-servicio">
        {odontologo ? `2. Elige un servicio de ${odontologo.nombre}` : '1. Elige un servicio'}
      </h2>
      {estado.status === 'cargando' && <LoadingState />}
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {estado.status === 'ok' && servicios.length === 0 && (
        <EmptyState title="No hay servicios disponibles" />
      )}
      {estado.status === 'ok' && servicios.length > 0 && (
        <ul className="service-list">
          {servicios.map((servicio) => (
            <li className="service" key={servicio.id}>
              <div className="service-text">
                <strong>{servicio.nombre}</strong>
                <span className="muted">
                  {servicio.descripcion} · {formatearDuracion(servicio.duracionMin)}
                </span>
              </div>
              <Button
                variant="secondary"
                aria-label={`Elegir ${servicio.nombre}`}
                onClick={() => onElegir(servicio)}
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
