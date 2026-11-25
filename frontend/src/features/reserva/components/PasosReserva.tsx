import { Icon } from '@/shared/components/Icon';

type Props = { steps: string[]; current: number };

// Barra de pasos de la reserva: casillas unidas por un renglón. Las de los pasos ya hechos quedan
// selladas con la tinta; el actual se marca con aria-current para los lectores de pantalla.
export function PasosReserva({ steps, current }: Props) {
  return (
    <ol className="pasos-reserva" aria-label="Pasos de la reserva">
      {steps.map((step, i) => (
        <li
          key={step}
          className={i < current ? 'paso-hecho' : i === current ? 'paso-actual' : undefined}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="paso-marca" aria-hidden="true">
            {i < current && <Icon name="tick" />}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
