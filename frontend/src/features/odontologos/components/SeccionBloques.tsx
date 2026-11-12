import { useState, type FormEvent } from 'react';
import type { CreateBlockRequest, UnavailableBlockResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { TextField } from '@/shared/components/TextField';
import { TimeField } from '@/shared/components/TimeField';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useForm } from '@/shared/hooks/useForm';
import { fechaHoraLocalAIso, formatearFechaHora } from '@/shared/lib/dates';
import { required } from '@/shared/lib/validators';

type Props = {
  bloques: UnavailableBlockResponse[];
  crear: (cuerpo: CreateBlockRequest) => Promise<void>;
  borrar: (blockId: string) => Promise<void>;
};

const VACIO = { inicioFecha: '', inicioHora: '', finFecha: '', finHora: '', motivo: '' };

// Pausas puntuales del odontólogo. Las fechas se escriben en hora de la clínica.
export function SeccionBloques({ bloques, crear, borrar }: Props) {
  const form = useForm(VACIO, {
    inicioFecha: required('Elige la fecha de inicio'),
    inicioHora: required('Elige la hora de inicio'),
    finFecha: required('Elige la fecha de fin'),
    finHora: (valor, v) =>
      required('Elige la hora de fin')(valor) ??
      (v.inicioFecha &&
      v.inicioHora &&
      v.finFecha &&
      `${v.finFecha}T${valor}` <= `${v.inicioFecha}T${v.inicioHora}`
        ? 'El fin debe ser posterior al inicio'
        : null),
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [quitando, setQuitando] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.validate()) return;
    const { inicioFecha, inicioHora, finFecha, finHora, motivo } = form.values;
    setEnviando(true);
    try {
      await crear({
        inicio: fechaHoraLocalAIso(`${inicioFecha}T${inicioHora}`),
        fin: fechaHoraLocalAIso(`${finFecha}T${finHora}`),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const quitar = async (bloque: UnavailableBlockResponse) => {
    const ok = await confirm({
      title: '¿Quitar este bloque?',
      message: 'El horario volverá a estar disponible para reservas.',
      confirmLabel: 'Quitar bloque',
    });
    if (!ok) return;
    setError('');
    setQuitando(bloque.id);
    try {
      await borrar(bloque.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setQuitando(null);
    }
  };

  return (
    <section className="card" aria-labelledby="titulo-bloques">
      <div className="card-section">
        <h2 id="titulo-bloques">Bloques no disponibles</h2>
        <p className="muted">Pausas puntuales en las que no se ofrecen horarios.</p>
      </div>
      {bloques.length === 0 ? (
        <p className="muted">No hay bloques no disponibles</p>
      ) : (
        <ul className="service-list">
          {bloques.map((bloque) => (
            <li className="service" key={bloque.id} data-testid={`bloque-${bloque.id}`}>
              <div className="service-text">
                <strong>
                  {formatearFechaHora(bloque.inicio)} a {formatearFechaHora(bloque.fin)}
                </strong>
                {bloque.motivo && <span className="muted">{bloque.motivo}</span>}
              </div>
              <Button
                variant="danger-outline"
                loading={quitando === bloque.id}
                onClick={() => void quitar(bloque)}
              >
                Quitar bloque
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="form-bloque"
        onSubmit={onSubmit}
        aria-label="Nuevo bloque no disponible"
        noValidate
      >
        <div className="form-row">
          <DateField {...form.field('inicioFecha')} label="Fecha de inicio" />
          <TimeField {...form.field('inicioHora')} label="Hora de inicio" />
        </div>
        <div className="form-row">
          <DateField {...form.field('finFecha')} label="Fecha de fin" />
          <TimeField {...form.field('finHora')} label="Hora de fin" />
        </div>
        <TextField {...form.field('motivo')} label="Motivo (opcional)" maxLength={200} />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <Button type="submit" loading={enviando} data-testid="btn-agregar-bloque">
            Agregar bloque
          </Button>
        </div>
      </form>
      {dialog}
    </section>
  );
}
