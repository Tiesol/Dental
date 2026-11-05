import { useParams } from 'react-router-dom';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { FormHorarios } from '../components/FormHorarios';
import { SeccionBloques } from '../components/SeccionBloques';
import { useDisponibilidad } from '../hooks/useDisponibilidad';
import { useOdontologoAdmin } from '../hooks/useOdontologoAdmin';

// Horarios de atención y bloques no disponibles de un odontólogo (ADMIN).
export function HorariosOdontologoPage() {
  const { id = '' } = useParams();
  const { estado, guardarHorarios, crearBloque, borrarBloque } = useDisponibilidad(id);
  const { estado: odontologo } = useOdontologoAdmin(id);

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Horarios y bloques"
        description={odontologo.status === 'ok' ? odontologo.odontologo.nombre : undefined}
        back={{ to: `/admin/odontologos/${id}`, label: 'Volver al odontólogo' }}
      />
      {estado.status === 'cargando' && <LoadingState />}
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {estado.status === 'ok' && (
        <>
          <FormHorarios horarios={estado.disponibilidad.horarios} guardar={guardarHorarios} />
          <SeccionBloques
            bloques={estado.disponibilidad.bloques}
            crear={crearBloque}
            borrar={borrarBloque}
          />
        </>
      )}
    </div>
  );
}
