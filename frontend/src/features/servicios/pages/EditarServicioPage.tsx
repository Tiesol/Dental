import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { FormularioServicio } from '../components/FormularioServicio';
import { useServicio } from '../hooks/useServicio';

const VOLVER = { to: '/admin/servicios', label: 'Volver al listado' };

export function EditarServicioPage() {
  const { id = '' } = useParams();
  const { estado, guardar, cambiarEstado } = useServicio(id);
  const { confirm, dialog } = useConfirm();
  const [cambiando, setCambiando] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');

  if (estado.status === 'cargando') return <LoadingState />;
  if (estado.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Editar servicio" back={VOLVER} />
        <ErrorMessage>{estado.mensaje}</ErrorMessage>
      </div>
    );
  }

  const { servicio } = estado;

  const alternarEstado = async () => {
    if (
      servicio.activo &&
      !(await confirm({
        title: '¿Deshabilitar este servicio?',
        message: 'No se podrá reservar con él, pero las citas existentes se conservan.',
        confirmLabel: 'Deshabilitar servicio',
      }))
    ) {
      return;
    }
    setErrorEstado('');
    setCambiando(true);
    try {
      await cambiarEstado(!servicio.activo);
    } catch (err) {
      setErrorEstado((err as Error).message);
    } finally {
      setCambiando(false);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Editar servicio" description={servicio.nombre} back={VOLVER} />
      <FormularioServicio
        key={servicio.id}
        inicial={servicio}
        textoBoton="Guardar cambios"
        textoBotonEnviando="Guardando…"
        conEstado={false}
        onSubmit={({ activo: _activo, ...cambios }) => guardar(cambios)}
      />
      <section className="card" aria-labelledby="titulo-estado-servicio">
        <div className="card-section">
          <h2 id="titulo-estado-servicio">Estado del servicio</h2>
          <div>
            <ActiveBadge active={servicio.activo} />
          </div>
          <p className="muted">Un servicio deshabilitado no se puede reservar.</p>
        </div>
        {errorEstado && <ErrorMessage>{errorEstado}</ErrorMessage>}
        <div className="form-actions">
          <button
            type="button"
            className={servicio.activo ? 'secondary danger' : 'secondary'}
            disabled={cambiando}
            onClick={() => void alternarEstado()}
            data-testid="btn-cambiar-estado-servicio"
          >
            {servicio.activo ? 'Deshabilitar servicio' : 'Habilitar servicio'}
          </button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
