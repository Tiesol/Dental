import { useParams } from 'react-router-dom';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { FormHorarios } from '../components/FormHorarios';
import { SeccionBloques } from '../components/SeccionBloques';
import { useAvailability } from '../hooks/useAvailability';
import { useAdminDentist } from '../hooks/useAdminDentist';

// Horarios de atención y bloques no disponibles de un odontólogo (ADMIN).
export function HorariosOdontologoPage() {
  const { id = '' } = useParams();
  const { state, saveSchedule, createBlock, deleteBlock } = useAvailability(id);
  const { state: dentist } = useAdminDentist(id);

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Horarios y bloques"
        description={dentist.status === 'ok' ? dentist.dentist.nombre : undefined}
        back={{ to: `/admin/odontologos/${id}`, label: 'Volver al odontólogo' }}
      />
      {state.status === 'cargando' && <LoadingState />}
      {state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
      {state.status === 'ok' && (
        <>
          <FormHorarios
            key={`horarios-${id}`}
            schedule={state.availability.horarios}
            save={saveSchedule}
          />
          <SeccionBloques
            key={`bloques-${id}`}
            blocks={state.availability.bloques}
            onCreate={createBlock}
            onDelete={deleteBlock}
          />
        </>
      )}
    </div>
  );
}
