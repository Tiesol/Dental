import { Icon } from '@/shared/components/Icon';

type Props = { pasos: string[]; actual: number };

// Barra de pasos de la reserva: casillas unidas por un renglón. Las de los pasos ya hechos quedan
// selladas con la tinta; el actual se marca con aria-current para los lectores de pantalla.
export function PasosReserva({ pasos, actual }: Props) {
  return (
    <ol className="pasos-reserva" aria-label="Pasos de la reserva">
      {pasos.map((paso, i) => (
        <li
          key={paso}
          className={i < actual ? 'paso-hecho' : i === actual ? 'paso-actual' : undefined}
          aria-current={i === actual ? 'step' : undefined}
        >
          <span className="paso-marca" aria-hidden="true">
            {i < actual && <Icon name="tick" />}
          </span>
          {paso}
        </li>
      ))}
    </ol>
  );
}
