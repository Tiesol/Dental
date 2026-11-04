import { Link, useNavigate } from 'react-router-dom';
import { FormularioServicio } from '../components/FormularioServicio';
import { useCrearServicio } from '../hooks/useCrearServicio';

export function NuevoServicioPage() {
  const navigate = useNavigate();
  const crear = useCrearServicio();

  return (
    <FormularioServicio
      titulo="Nuevo servicio"
      textoBoton="Crear servicio"
      textoBotonEnviando="Creando…"
      conEstado
      onSubmit={async (datos) => {
        await crear(datos);
        navigate('/admin/servicios');
      }}
    >
      <Link to="/admin/servicios">Volver al listado</Link>
    </FormularioServicio>
  );
}
