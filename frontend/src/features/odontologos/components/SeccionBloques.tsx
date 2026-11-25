import { useState, type FormEvent } from 'react';
import type { CreateBlockRequest, UnavailableBlockResponse } from '@/api/types';
import { Button } from '@/shared/components/Button';
import { DateField } from '@/shared/components/DateField';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { TextField } from '@/shared/components/TextField';
import { TimeField } from '@/shared/components/TimeField';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useForm } from '@/shared/hooks/useForm';
import { localDateTimeToIso, formatDateTime } from '@/shared/lib/dates';
import { required } from '@/shared/lib/validators';

type Props = {
  blocks: UnavailableBlockResponse[];
  onCreate: (body: CreateBlockRequest) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
};

const EMPTY = { startDate: '', startTime: '', endDate: '', endTime: '', motivo: '' };

// Pausas puntuales del odontólogo. Las fechas se escriben en hora de la clínica.
export function SeccionBloques({ blocks, onCreate, onDelete }: Props) {
  const form = useForm(EMPTY, {
    startDate: required('Elige la fecha de inicio'),
    startTime: required('Elige la hora de inicio'),
    endDate: required('Elige la fecha de fin'),
    endTime: (value, v) =>
      required('Elige la hora de fin')(value) ??
      (v.startDate &&
      v.startTime &&
      v.endDate &&
      `${v.endDate}T${value}` <= `${v.startDate}T${v.startTime}`
        ? 'El fin debe ser posterior al inicio'
        : null),
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.validate()) return;
    const { startDate, startTime, endDate, endTime, motivo: reason } = form.values;
    setSending(true);
    try {
      await onCreate({
        inicio: localDateTimeToIso(`${startDate}T${startTime}`),
        fin: localDateTimeToIso(`${endDate}T${endTime}`),
        ...(reason.trim() ? { motivo: reason.trim() } : {}),
      });
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (block: UnavailableBlockResponse) => {
    const ok = await confirm({
      title: '¿Quitar este bloque?',
      message: 'El horario volverá a estar disponible para reservas.',
      confirmLabel: 'Quitar bloque',
    });
    if (!ok) return;
    setError('');
    setRemoving(block.id);
    try {
      await onDelete(block.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section className="card" aria-labelledby="titulo-bloques">
      <div className="card-section">
        <h2 id="titulo-bloques">Bloques no disponibles</h2>
        <p className="muted">Pausas puntuales en las que no se ofrecen horarios.</p>
      </div>
      {blocks.length === 0 ? (
        <p className="muted">No hay bloques no disponibles</p>
      ) : (
        <ul className="service-list">
          {blocks.map((block) => (
            <li className="service" key={block.id} data-testid={`bloque-${block.id}`}>
              <div className="service-text">
                <strong>
                  {formatDateTime(block.inicio)} a {formatDateTime(block.fin)}
                </strong>
                {block.motivo && <span className="muted">{block.motivo}</span>}
              </div>
              <Button
                variant="danger-outline"
                loading={removing === block.id}
                onClick={() => void remove(block)}
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
          <DateField {...form.field('startDate')} label="Fecha de inicio" />
          <TimeField {...form.field('startTime')} label="Hora de inicio" />
        </div>
        <div className="form-row">
          <DateField {...form.field('endDate')} label="Fecha de fin" />
          <TimeField {...form.field('endTime')} label="Hora de fin" />
        </div>
        <TextField {...form.field('motivo')} label="Motivo (opcional)" maxLength={200} />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <Button type="submit" loading={sending} data-testid="btn-agregar-bloque">
            Agregar bloque
          </Button>
        </div>
      </form>
      {dialog}
    </section>
  );
}
