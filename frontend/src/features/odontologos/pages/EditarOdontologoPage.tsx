import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DentistAdminResponse, UpdateDentistRequest } from '@/api/types';
import { SelectorServicios } from '../components/SelectorServicios';
import { useOdontologoAdmin } from '../hooks/useOdontologoAdmin';
import { useServiciosParaElegir } from '../hooks/useServiciosParaElegir';

export function EditarOdontologoPage() {
  const { id = '' } = useParams();
  const { estado, guardarDatos, guardarServicios, cambiarEstado } = useOdontologoAdmin(id);

  if (estado.status === 'cargando') return <p className="muted">Cargando…</p>;
  if (estado.status === 'error') {
    return (
      <section className="card">
        <p className="error" role="alert" data-testid="error-mensaje">
          {estado.mensaje}
        </p>
        <Link to="/admin/odontologos">Volver al listado</Link>
      </section>
    );
  }

  const { odontologo } = estado;
  return (
    <div className="stack">
      <DatosProfesionales
        key={`datos-${odontologo.id}`}
        odontologo={odontologo}
        guardar={guardarDatos}
      />
      <ServiciosQueRealiza
        key={`servicios-${odontologo.id}`}
        odontologo={odontologo}
        guardar={guardarServicios}
      />
      <EstadoProfesional odontologo={odontologo} cambiarEstado={cambiarEstado} />
      <p className="centrado">
        <Link to="/admin/odontologos">Volver al listado</Link>
      </p>
    </div>
  );
}

// Ejecuta una acción mostrando "enviando", error o éxito. Evita repetir lo mismo en cada sección.
function useAccion() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const ejecutar = async (accion: () => Promise<void>, mensajeExito: string) => {
    setError('');
    setExito('');
    setEnviando(true);
    try {
      await accion();
      setExito(mensajeExito);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const mensajes = (
    <>
      {error && (
        <p className="error" role="alert" data-testid="error-mensaje">
          {error}
        </p>
      )}
      {exito && (
        <p className="success" role="status">
          {exito}
        </p>
      )}
    </>
  );

  return { enviando, ejecutar, mensajes };
}

function DatosProfesionales({
  odontologo,
  guardar,
}: {
  odontologo: DentistAdminResponse;
  guardar: (cambios: UpdateDentistRequest) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(odontologo.nombre);
  const [especialidad, setEspecialidad] = useState(odontologo.especialidad);
  const { enviando, ejecutar, mensajes } = useAccion();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(() => guardar({ nombre, especialidad }), 'Datos guardados');
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h1>Editar odontólogo</h1>
      <dl>
        <dt>Email</dt>
        <dd>{odontologo.email}</dd>
        <dt>Cuenta</dt>
        <dd>
          {odontologo.cuentaActiva ? 'Habilitada' : 'Deshabilitada'} ·{' '}
          <Link to={`/admin/usuarios/${odontologo.userId}`}>Gestionar cuenta</Link>
        </dd>
      </dl>
      <label>
        Nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          maxLength={100}
        />
      </label>
      <label>
        Especialidad
        <input
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          required
          maxLength={100}
        />
      </label>
      {mensajes}
      <button type="submit" disabled={enviando} data-testid="btn-guardar-odontologo">
        {enviando ? 'Guardando…' : 'Guardar datos'}
      </button>
    </form>
  );
}

function ServiciosQueRealiza({
  odontologo,
  guardar,
}: {
  odontologo: DentistAdminResponse;
  guardar: (serviceIds: string[]) => Promise<void>;
}) {
  const { servicios, error: errorServicios } = useServiciosParaElegir();
  const [seleccionados, setSeleccionados] = useState(odontologo.servicios.map((s) => s.id));
  const { enviando, ejecutar, mensajes } = useAccion();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(() => guardar(seleccionados), 'Servicios actualizados');
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <SelectorServicios
        servicios={servicios}
        seleccionados={seleccionados}
        onChange={setSeleccionados}
        disabled={enviando}
      />
      {errorServicios && <p className="error">{errorServicios}</p>}
      {mensajes}
      <button type="submit" disabled={enviando} data-testid="btn-guardar-servicios-odontologo">
        {enviando ? 'Guardando…' : 'Guardar servicios'}
      </button>
    </form>
  );
}

function EstadoProfesional({
  odontologo,
  cambiarEstado,
}: {
  odontologo: DentistAdminResponse;
  cambiarEstado: (activo: boolean) => Promise<void>;
}) {
  const { enviando, ejecutar, mensajes } = useAccion();

  const alternar = () => {
    if (
      odontologo.activo &&
      !window.confirm('¿Deshabilitar? No recibirá nuevas citas; sus citas existentes se conservan.')
    ) {
      return;
    }
    void ejecutar(
      () => cambiarEstado(!odontologo.activo),
      odontologo.activo ? 'Odontólogo deshabilitado' : 'Odontólogo habilitado',
    );
  };

  return (
    <section className="card">
      <h2>Estado profesional</h2>
      <p>
        <span className={odontologo.activo ? 'badge ok' : 'badge off'}>
          {odontologo.activo ? 'Acepta citas' : 'Deshabilitado'}
        </span>
      </p>
      <p className="muted">
        Deshabilitado no recibe nuevas citas ni aparece para los pacientes; su historial se
        conserva.
      </p>
      {mensajes}
      <button
        type="button"
        className={odontologo.activo ? 'secondary danger' : 'secondary'}
        disabled={enviando}
        onClick={alternar}
        data-testid="btn-cambiar-estado-odontologo"
      >
        {odontologo.activo ? 'Deshabilitar odontólogo' : 'Habilitar odontólogo'}
      </button>
    </section>
  );
}
