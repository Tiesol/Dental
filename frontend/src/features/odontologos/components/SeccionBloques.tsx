import { useState, type FormEvent } from 'react';
import type { CreateBlockRequest, UnavailableBlockResponse } from '@/api/types';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { fechaHoraLocalAIso, formatearFechaHora } from '@/shared/lib/dates';

type Props = {
  bloques: UnavailableBlockResponse[];
  crear: (cuerpo: CreateBlockRequest) => Promise<void>;
  borrar: (blockId: string) => Promise<void>;
};

// Pausas puntuales del odontólogo. Las fechas se escriben en hora de la clínica.
export function SeccionBloques({ bloques, crear, borrar }: Props) {
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const { confirm, dialog } = useConfirm();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await crear({
        inicio: fechaHoraLocalAIso(inicio),
        fin: fechaHoraLocalAIso(fin),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });
      setInicio('');
      setFin('');
      setMotivo('');
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
    try {
      await borrar(bloque.id);
    } catch (err) {
      setError((err as Error).message);
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
              <button
                type="button"
                className="secondary danger"
                onClick={() => void quitar(bloque)}
              >
                Quitar bloque
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onSubmit(e)} aria-label="Nuevo bloque no disponible">
        <div className="form-row">
          <label>
            Inicio
            <input
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
            />
          </label>
          <label>
            Fin
            <input
              type="datetime-local"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Motivo (opcional)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} />
        </label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <button type="submit" disabled={enviando} data-testid="btn-agregar-bloque">
            {enviando ? 'Agregando…' : 'Agregar bloque'}
          </button>
        </div>
      </form>
      {dialog}
    </section>
  );
}
