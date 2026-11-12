import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DentistAdminResponse, UpdateDentistRequest } from '@/api/types';
import { ActiveBadge } from '@/shared/components/ActiveBadge';
import { Button } from '@/shared/components/Button';
import { ButtonLink } from '@/shared/components/ButtonLink';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { TextField } from '@/shared/components/TextField';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useForm } from '@/shared/hooks/useForm';
import { required } from '@/shared/lib/validators';
import { SelectorServicios } from '../components/SelectorServicios';
import { useAccion } from '../hooks/useAccion';
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
      <PageHeader
        title="Editar odontólogo"
        description={odontologo.nombre}
        back={VOLVER}
        actions={
          <ButtonLink to={`/admin/odontologos/${odontologo.id}/horarios`} variant="secondary">
            Horarios y bloques
          </ButtonLink>
        }
      />
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

function DatosProfesionales({
  odontologo,
  guardar,
}: {
  odontologo: DentistAdminResponse;
  guardar: (cambios: UpdateDentistRequest) => Promise<void>;
}) {
  const form = useForm(
    { nombre: odontologo.nombre, especialidad: odontologo.especialidad },
    {
      nombre: required('Escribe el nombre'),
      especialidad: required('Escribe la especialidad'),
    },
  );
  const { enviando, ejecutar, mensajes } = useAccion();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    await ejecutar(
      () =>
        guardar({
          nombre: form.values.nombre.trim(),
          especialidad: form.values.especialidad.trim(),
        }),
      'Datos guardados',
    );
  };

  return (
    <form
      className="card"
      onSubmit={onSubmit}
      aria-labelledby="titulo-datos-profesionales"
      noValidate
    >
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
        <TextField {...form.field('nombre')} label="Nombre" maxLength={100} />
        <TextField {...form.field('especialidad')} label="Especialidad" maxLength={100} />
      </div>
      {mensajes}
      <div className="form-actions">
        <Button type="submit" loading={enviando} data-testid="btn-guardar-odontologo">
          Guardar datos
        </Button>
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await ejecutar(() => guardar(seleccionados), 'Servicios actualizados');
  };

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <SelectorServicios
        servicios={servicios}
        seleccionados={seleccionados}
        onChange={setSeleccionados}
        disabled={enviando}
      />
      {errorServicios && <ErrorMessage>{errorServicios}</ErrorMessage>}
      {mensajes}
      <div className="form-actions">
        <Button type="submit" loading={enviando} data-testid="btn-guardar-servicios-odontologo">
          Guardar servicios
        </Button>
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
    await ejecutar(
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
        <Button
          variant={odontologo.activo ? 'danger-outline' : 'secondary'}
          loading={enviando}
          onClick={() => void alternar()}
          data-testid="btn-cambiar-estado-odontologo"
        >
          {odontologo.activo ? 'Deshabilitar odontólogo' : 'Habilitar odontólogo'}
        </Button>
      </div>
      {dialog}
    </section>
  );
}
