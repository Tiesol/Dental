import { useState, type FormEvent } from 'react';
import type { AvailabilityRuleRequest, AvailabilityRuleResponse } from '@/api/types';
import { horaAMinutos, minutosAHora } from '@/shared/lib/dates';
import { useAccion } from '../hooks/useAccion';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Tramo = { clave: number; diaSemana: number; desde: string; hasta: string };

type Props = {
  horarios: AvailabilityRuleResponse[];
  guardar: (horarios: AvailabilityRuleRequest[]) => Promise<void>;
};

// Edita la lista completa de tramos: guardar reemplaza todos los horarios del odontólogo.
// Un horario partido son dos tramos del mismo día. Las reglas las valida el backend.
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

  const cambiar = (clave: number, cambios: Partial<Tramo>) =>
    setTramos((actuales) => actuales.map((t) => (t.clave === clave ? { ...t, ...cambios } : t)));

  const agregar = () => {
    setTramos((actuales) => [
      ...actuales,
      { clave: siguienteClave, diaSemana: 1, desde: '09:00', hasta: '12:00' },
    ]);
    setSiguienteClave((clave) => clave + 1);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(
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

  return (
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-horarios">
      <div className="card-section">
        <h2 id="titulo-horarios">Horarios de atención</h2>
        <p className="muted">
          Para un horario partido, agrega dos tramos el mismo día. Las citas ya creadas fuera del
          horario nuevo se conservan.
        </p>
      </div>
      {tramos.length === 0 && <p className="muted">Todavía no tiene horarios de atención</p>}
      {tramos.map((tramo, indice) => (
        <div className="tramo" key={tramo.clave} data-testid={`tramo-${indice}`}>
          <label>
            Día
            <select
              value={tramo.diaSemana}
              onChange={(e) => cambiar(tramo.clave, { diaSemana: Number(e.target.value) })}
            >
              {DIAS.map((dia, valor) => (
                <option key={dia} value={valor}>
                  {dia}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="time"
              value={tramo.desde}
              onChange={(e) => cambiar(tramo.clave, { desde: e.target.value })}
              required
            />
          </label>
          <label>
            Hasta
            <input
              type="time"
              value={tramo.hasta}
              onChange={(e) => cambiar(tramo.clave, { hasta: e.target.value })}
              required
            />
          </label>
          <button
            type="button"
            className="secondary danger"
            aria-label={`Quitar tramo ${indice + 1}`}
            onClick={() => setTramos((actuales) => actuales.filter((t) => t.clave !== tramo.clave))}
          >
            Quitar
          </button>
        </div>
      ))}
      {mensajes}
      <div className="form-actions">
        <button type="button" className="secondary" onClick={agregar}>
          Agregar tramo
        </button>
        <button type="submit" disabled={enviando} data-testid="btn-guardar-horarios">
          {enviando ? 'Guardando…' : 'Guardar horarios'}
        </button>
      </div>
    </form>
  );
}
