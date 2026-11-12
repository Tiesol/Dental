import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { FormularioServicio } from '../components/FormularioServicio';
import { useCrearServicio } from '../hooks/useCrearServicio';

export function NuevoServicioPage() {
  const navigate = useNavigate();
  const crear = useCrearServicio();

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Nuevo servicio"
        back={{ to: '/admin/servicios', label: 'Volver al listado' }}
      />
      <FormularioServicio
        textoBoton="Crear servicio"
        conEstado
        onSubmit={async (datos) => {
          await crear(datos);
          navigate('/admin/servicios');
        }}
      />
    </div>
  );
}
