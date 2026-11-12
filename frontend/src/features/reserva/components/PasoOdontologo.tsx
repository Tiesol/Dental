import { useCallback } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistPublicResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { useCarga } from '@/shared/hooks/useCarga';

type Props = { serviceId: string; onElegir: (odontologo: DentistPublicResponse) => void };

// Solo odontólogos que aceptan citas y realizan el servicio: lo filtra el backend.
export function PasoOdontologo({ serviceId, onElegir }: Props) {
  const cargar = useCallback(
    (signal: AbortSignal) => dentistsApi.listar(serviceId, signal),
    [serviceId],
  );
  const { estado } = useCarga(cargar);

  return (
    <section className="card" aria-labelledby="titulo-paso-odontologo">
      <h2 id="titulo-paso-odontologo">2. Elige un odontólogo</h2>
      {estado.status === 'cargando' && <LoadingState />}
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {estado.status === 'ok' && estado.datos.length === 0 && (
        <EmptyState
          title="No hay odontólogos para este servicio"
          description="Elige otro servicio."
        />
      )}
      {estado.status === 'ok' && estado.datos.length > 0 && (
        <ul className="service-list">
          {estado.datos.map((odontologo) => (
            <li className="service" key={odontologo.id}>
              <div className="service-text">
                <strong>{odontologo.nombre}</strong>
                <span className="muted">{odontologo.especialidad}</span>
              </div>
              <Button
                variant="secondary"
                aria-label={`Elegir ${odontologo.nombre}`}
                onClick={() => onElegir(odontologo)}
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
