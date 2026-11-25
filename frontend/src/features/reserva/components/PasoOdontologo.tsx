import { useCallback } from 'react';
import { dentistsApi } from '@/api/endpoints/dentists';
import type { DentistPublicResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { useLoader } from '@/shared/hooks/useLoader';

type Props = { serviceId: string; onChoose: (dentist: DentistPublicResponse) => void };

// Solo odontólogos que aceptan citas y realizan el servicio: lo filtra el backend.
export function PasoOdontologo({ serviceId, onChoose }: Props) {
  const load = useCallback(
    (signal: AbortSignal) => dentistsApi.list(serviceId, signal),
    [serviceId],
  );
  const { state } = useLoader(load);

  return (
    <section className="card" aria-labelledby="titulo-paso-odontologo">
      <h2 id="titulo-paso-odontologo">2. Elige un odontólogo</h2>
      {state.status === 'cargando' && <LoadingState />}
      {state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
      {state.status === 'ok' && state.data.length === 0 && (
        <EmptyState
          title="No hay odontólogos para este servicio"
          description="Elige otro servicio."
        />
      )}
      {state.status === 'ok' && state.data.length > 0 && (
        <ul className="service-list">
          {state.data.map((dentist) => (
            <li className="service" key={dentist.id}>
              <div className="service-text">
                <strong>{dentist.nombre}</strong>
                <span className="muted">{dentist.especialidad}</span>
              </div>
              <Button
                variant="secondary"
                aria-label={`Elegir ${dentist.nombre}`}
                onClick={() => onChoose(dentist)}
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
