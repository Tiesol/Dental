import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DentistAdminResponse, UpdateDentistRequest } from '@/api/types';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { SuccessMessage } from '@/shared/components/SuccessMessage';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { SelectorServicios } from '../components/SelectorServicios';
import { useOdontologoAdmin } from '../hooks/useOdontologoAdmin';
import { useServiciosParaElegir } from '../hooks/useServiciosParaElegir';

const VOLVER = { to: '/admin/odontologos', label: 'Volver al listado' };

export function EditarOdontologoPage() {
  const { id = '' } = useParams();
  const { estado, guardarDatos, guardarServicios, cambiarEstado } = useOdontologoAdmin(id);

  if (estado.status === 'cargando') return <LoadingState />;
  if (estado.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Editar odontólogo" back={VOLVER} />
        <ErrorMessage>{estado.mensaje}</ErrorMessage>
      </div>
    );
  }

  const { odontologo } = estado;
  return (
    <div className="page page-narrow">
      <PageHeader title="Editar odontólogo" description={odontologo.nombre} back={VOLVER} />
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
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {exito && <SuccessMessage>{exito}</SuccessMessage>}
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
    <form className="card" onSubmit={onSubmit} aria-labelledby="titulo-datos-profesionales">
      <h2 id="titulo-datos-profesionales">Datos profesionales</h2>
      <dl className="details">
        <dt>Email</dt>
        <dd>{odontologo.email}</dd>
        <dt>Cuenta</dt>
        <dd>
          {odontologo.cuentaActiva ? 'Habilitada' : 'Deshabilitada'} ·{' '}
          <Link to={`/admin/usuarios/${odontologo.userId}`}>Gestionar cuenta</Link>
        </dd>
      </dl>
      <div className="form-row">
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
      </div>
      {mensajes}
      <div className="form-actions">
        <button type="submit" disabled={enviando} data-testid="btn-guardar-odontologo">
          {enviando ? 'Guardando…' : 'Guardar datos'}
        </button>
      </div>
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
      {errorServicios && <ErrorMessage>{errorServicios}</ErrorMessage>}
      {mensajes}
      <div className="form-actions">
        <button type="submit" disabled={enviando} data-testid="btn-guardar-servicios-odontologo">
          {enviando ? 'Guardando…' : 'Guardar servicios'}
        </button>
      </div>
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
  const { confirm, dialog } = useConfirm();

  const alternar = async () => {
    if (
      odontologo.activo &&
      !(await confirm({
        title: `¿Deshabilitar a ${odontologo.nombre}?`,
        message: 'No recibirá nuevas citas; sus citas existentes se conservan.',
        confirmLabel: 'Deshabilitar odontólogo',
      }))
    ) {
      return;
    }
    void ejecutar(
      () => cambiarEstado(!odontologo.activo),
      odontologo.activo ? 'Odontólogo deshabilitado' : 'Odontólogo habilitado',
    );
  };

  return (
    <section className="card" aria-labelledby="titulo-estado-profesional">
      <div className="card-section">
        <h2 id="titulo-estado-profesional">Estado profesional</h2>
        <div>
          <ActiveBadge active={odontologo.activo} activeLabel="Acepta citas" />
        </div>
        <p className="muted">
          Deshabilitado no recibe nuevas citas ni aparece para los pacientes; su historial se
          conserva.
        </p>
      </div>
      {mensajes}
      <div className="form-actions">
        <button
          type="button"
          className={odontologo.activo ? 'secondary danger' : 'secondary'}
          disabled={enviando}
          onClick={() => void alternar()}
          data-testid="btn-cambiar-estado-odontologo"
        >
          {odontologo.activo ? 'Deshabilitar odontólogo' : 'Habilitar odontólogo'}
        </button>
      </div>
      {dialog}
    </section>
  );
}
