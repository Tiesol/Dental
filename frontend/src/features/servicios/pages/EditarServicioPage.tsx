import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { FormularioServicio } from '../components/FormularioServicio';
import { useService } from '../hooks/useService';

const BACK = { to: '/admin/servicios', label: 'Volver al listado' };

export function EditarServicioPage() {
  const { id = '' } = useParams();
  const { state, save, changeStatus } = useService(id);
  const { confirm, dialog } = useConfirm();
  const [changing, setChanging] = useState(false);
  const [statusError, setStatusError] = useState('');

  if (state.status === 'cargando') return <LoadingState />;
  if (state.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Editar servicio" back={BACK} />
        <ErrorMessage>{state.message}</ErrorMessage>
      </div>
    );
  }

  const { service } = state;

  const toggleStatus = async () => {
    if (
      service.activo &&
      !(await confirm({
        title: '¿Deshabilitar este servicio?',
        message: 'No se podrá reservar con él, pero las citas existentes se conservan.',
        confirmLabel: 'Deshabilitar servicio',
      }))
    ) {
      return;
    }
    setStatusError('');
    setChanging(true);
    try {
      await changeStatus(!service.activo);
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Editar servicio" description={service.nombre} back={BACK} />
      <FormularioServicio
        key={service.id}
        initial={service}
        buttonText="Guardar cambios"
        withStatus={false}
        onSubmit={({ activo: _active, ...changes }) => save(changes)}
      />
      <section className="card" aria-labelledby="titulo-estado-servicio">
        <div className="card-section">
          <h2 id="titulo-estado-servicio">Estado del servicio</h2>
          <div>
            <ActiveBadge active={service.activo} />
          </div>
          <p className="muted">Un servicio deshabilitado no se puede reservar.</p>
        </div>
        {statusError && <ErrorMessage>{statusError}</ErrorMessage>}
        <div className="form-actions">
          <Button
            variant={service.activo ? 'danger-outline' : 'secondary'}
            loading={changing}
            onClick={() => void toggleStatus()}
            data-testid="btn-cambiar-estado-servicio"
          >
            {service.activo ? 'Deshabilitar servicio' : 'Habilitar servicio'}
          </Button>
        </div>
      </section>
      {dialog}
    </div>
  );
}
