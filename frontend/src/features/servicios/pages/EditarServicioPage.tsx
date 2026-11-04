import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FormularioServicio } from '../components/FormularioServicio';
import { useServicio } from '../hooks/useServicio';

export function EditarServicioPage() {
  const { id = '' } = useParams();
  const { estado, guardar, cambiarEstado } = useServicio(id);
  const [cambiando, setCambiando] = useState(false);
  const [errorEstado, setErrorEstado] = useState('');

  if (estado.status === 'cargando') return <p className="muted">Cargando…</p>;
  if (estado.status === 'error') {
    return (
      <section className="card">
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.mensaje}
        </p>
        <Link to="/admin/servicios">Volver al listado</Link>
      </section>
    );
  }

  const { servicio } = estado;

  const alternarEstado = async () => {
    if (
      servicio.activo &&
      !window.confirm('¿Deshabilitar este servicio? No se podrá reservar con él.')
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
    <FormularioServicio
      key={servicio.id}
      titulo="Editar servicio"
      inicial={servicio}
      textoBoton="Guardar cambios"
      textoBotonEnviando="Guardando…"
      conEstado={false}
      onSubmit={({ activo: _activo, ...cambios }) => guardar(cambios)}
    >
      <p className="muted">
        Estado:{' '}
        <span className={servicio.activo ? 'badge ok' : 'badge off'}>
          {servicio.activo ? 'Habilitado' : 'Deshabilitado'}
        </span>
      </p>
      {errorEstado && (
        <p className="error" role="alert">
          {errorEstado}
        </p>
      )}
      <button
        type="button"
        className={servicio.activo ? 'secondary danger' : 'secondary'}
        disabled={cambiando}
        onClick={() => void alternarEstado()}
        data-testid="btn-cambiar-estado-servicio"
      >
        {servicio.activo ? 'Deshabilitar servicio' : 'Habilitar servicio'}
      </button>
      <Link to="/admin/servicios">Volver al listado</Link>
    </FormularioServicio>
  );
}
