import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { FormularioServicio } from '../components/FormularioServicio';
import { useCreateService } from '../hooks/useCreateService';

export function NuevoServicioPage() {
  const navigate = useNavigate();
  const create = useCreateService();

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Nuevo servicio"
        back={{ to: '/admin/servicios', label: 'Volver al listado' }}
      />
      <FormularioServicio
        buttonText="Crear servicio"
        withStatus
        onSubmit={async (data) => {
          await create(data);
          navigate('/admin/servicios');
        }}
      />
    </div>
  );
}
