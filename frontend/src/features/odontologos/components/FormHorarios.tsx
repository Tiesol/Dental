import { useState, type FormEvent } from 'react';
import type { AvailabilityRuleRequest, AvailabilityRuleResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { Select, type SelectOption } from '@/shared/components/Select';
import { TimeField } from '@/shared/components/TimeField';
import { useFieldErrors, type FieldCheck } from '@/shared/hooks/useFieldErrors';
import { horaAMinutos, minutosAHora } from '@/shared/lib/dates';
import { useAccion } from '../hooks/useAccion';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const OPCIONES_DIA: SelectOption<number>[] = DIAS.map((dia, valor) => ({
  value: valor,
  label: dia,
}));

type Tramo = { clave: number; diaSemana: number; desde: string; hasta: string };
type CampoHora = 'desde' | 'hasta';

const nombreCampo = (tramo: Tramo, campo: CampoHora) => `${tramo.clave}-${campo}`;

const errorDe = (tramo: Tramo, campo: CampoHora): string | null => {
  if (campo === 'desde') return tramo.desde ? null : 'Elige la hora de inicio';
  if (!tramo.hasta) return 'Elige la hora de fin';
  return tramo.desde && tramo.hasta <= tramo.desde ? 'Debe ser posterior a la de inicio' : null;
};

const checksDe = (tramo: Tramo): FieldCheck[] => [
  [nombreCampo(tramo, 'desde'), errorDe(tramo, 'desde')],
  [nombreCampo(tramo, 'hasta'), errorDe(tramo, 'hasta')],
];

type Props = {
  horarios: AvailabilityRuleResponse[];
  guardar: (horarios: AvailabilityRuleRequest[]) => Promise<void>;
};

// Edita la lista completa de tramos: guardar reemplaza todos los horarios del odontólogo.
// Un horario partido son dos tramos del mismo día. El backend vuelve a validar las reglas.
export function FormHorarios({ horarios, guardar }: Props) {
  const [tramos, setTramos] = useState<Tramo[]>(() =>
    horarios.map((h, clave) => ({
      clave,
      diaSemana: h.diaSemana,
      desde: minutosAHora(h.minutoInicio),
      hasta: minutosAHora(h.minutoFin),
    })),
  );
  const [siguienteClave, setSiguienteClave] = useState(horarios.length);
  const { enviando, ejecutar, mensajes } = useAccion();
  const errores = useFieldErrors();

  const cambiar = (clave: number, cambios: Partial<Tramo>) => {
    const actualizados = tramos.map((t) => (t.clave === clave ? { ...t, ...cambios } : t));
    setTramos(actualizados);
    const tramo = actualizados.find((t) => t.clave === clave);
    if (tramo) errores.revalidate(checksDe(tramo));
  };

  const agregar = () => {
    setTramos((actuales) => [
      ...actuales,
      { clave: siguienteClave, diaSemana: 1, desde: '09:00', hasta: '12:00' },
    ]);
    setSiguienteClave((clave) => clave + 1);
  };

  const quitar = (tramo: Tramo) => {
    setTramos((actuales) => actuales.filter((t) => t.clave !== tramo.clave));
    errores.clear([nombreCampo(tramo, 'desde'), nombreCampo(tramo, 'hasta')]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!errores.validateAll(tramos.flatMap(checksDe))) return;
    await ejecutar(
      () =>
        guardar(
          tramos.map((t) => ({
            diaSemana: t.diaSemana,
            minutoInicio: horaAMinutos(t.desde),
            minutoFin: horaAMinutos(t.hasta),
          })),
        ),
      'Horarios guardados',
    );
  };

  const campoHora = (tramo: Tramo, campo: CampoHora, etiqueta: string) => {
    const nombre = nombreCampo(tramo, campo);
    return (
      <TimeField
        label={etiqueta}
        value={tramo[campo]}
        onChange={(valor) =>
          cambiar(tramo.clave, campo === 'desde' ? { desde: valor } : { hasta: valor })
        }
        onBlur={() => errores.blur(nombre, errorDe(tramo, campo))}
        error={errores.errors[nombre]}
        ref={errores.register(nombre)}
      />
    );
  };

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-horarios" noValidate>
      <div className="card-section">
        <h2 id="titulo-horarios">Horarios de atención</h2>
        <p className="muted">
          Para un horario partido, agrega dos tramos el mismo día. Las citas ya creadas fuera del
          horario nuevo se conservan.
        </p>
      </div>
      {tramos.length === 0 && <p className="muted">Todavía no tiene horarios de atención</p>}
      {tramos.map((tramo, indice) => (
        <div
          className="tramo"
          key={tramo.clave}
          role="group"
          aria-label={`Tramo ${indice + 1}`}
          data-testid={`tramo-${indice}`}
        >
          <Select
            label="Día"
            value={tramo.diaSemana}
            options={OPCIONES_DIA}
            onChange={(diaSemana) => cambiar(tramo.clave, { diaSemana })}
          />
          {campoHora(tramo, 'desde', 'Desde')}
          {campoHora(tramo, 'hasta', 'Hasta')}
          <Button
            variant="danger-outline"
            aria-label={`Quitar tramo ${indice + 1}`}
            onClick={() => quitar(tramo)}
          >
            Quitar
          </Button>
        </div>
      ))}
      {mensajes}
      <div className="form-actions">
        <Button variant="secondary" onClick={agregar}>
          Agregar tramo
        </Button>
        <Button type="submit" loading={enviando} data-testid="btn-guardar-horarios">
          Guardar horarios
        </Button>
      </div>
    </form>
  );
}
