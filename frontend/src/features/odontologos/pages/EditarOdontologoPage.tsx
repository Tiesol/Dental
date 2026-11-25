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
import { useAction } from '../hooks/useAction';
import { useAdminDentist } from '../hooks/useAdminDentist';
import { useSelectableServices } from '../hooks/useSelectableServices';

const BACK = { to: '/admin/odontologos', label: 'Volver al listado' };

export function EditarOdontologoPage() {
  const { id = '' } = useParams();
  const { state, saveData, saveServices, changeStatus } = useAdminDentist(id);

  if (state.status === 'cargando') return <LoadingState />;
  if (state.status === 'error') {
    return (
      <div className="page page-narrow">
        <PageHeader title="Editar odontólogo" back={BACK} />
        <ErrorMessage>{state.message}</ErrorMessage>
      </div>
    );
  }

  const { dentist } = state;
  return (
    <div className="page page-narrow">
      <PageHeader
        title="Editar odontólogo"
        description={dentist.nombre}
        back={BACK}
        actions={
          <ButtonLink to={`/admin/odontologos/${dentist.id}/horarios`} variant="secondary">
            Horarios y bloques
          </ButtonLink>
        }
      />
      <DatosProfesionales key={`datos-${dentist.id}`} dentist={dentist} save={saveData} />
      <ServiciosQueRealiza
        key={`servicios-${dentist.id}`}
        odontologo={dentist}
        guardar={saveServices}
      />
      <EstadoProfesional odontologo={dentist} changeStatus={changeStatus} />
    </div>
  );
}

function DatosProfesionales({
  dentist,
  save,
}: {
  dentist: DentistAdminResponse;
  save: (changes: UpdateDentistRequest) => Promise<void>;
}) {
  const form = useForm(
    { nombre: dentist.nombre, especialidad: dentist.especialidad },
    {
      nombre: required('Escribe el nombre'),
      especialidad: required('Escribe la especialidad'),
    },
  );
  const { sending, run, messages } = useAction();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    await run(
      () =>
        save({
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
        <dd>{dentist.email}</dd>
        <dt>Cuenta</dt>
        <dd>
          {dentist.cuentaActiva ? 'Habilitada' : 'Deshabilitada'} ·{' '}
          <Link to={`/admin/usuarios/${dentist.userId}`}>Gestionar cuenta</Link>
        </dd>
      </dl>
      <div className="form-row">
        <TextField {...form.field('nombre')} label="Nombre" maxLength={100} />
        <TextField {...form.field('especialidad')} label="Especialidad" maxLength={100} />
      </div>
      {messages}
      <div className="form-actions">
        <Button type="submit" loading={sending} data-testid="btn-guardar-odontologo">
          Guardar datos
        </Button>
      </div>
    </form>
  );
}

function ServiciosQueRealiza({
  odontologo: dentist,
  guardar: save,
}: {
  odontologo: DentistAdminResponse;
  guardar: (serviceIds: string[]) => Promise<void>;
}) {
  const { services, error: servicesError } = useSelectableServices();
  const [selected, setSelected] = useState(dentist.servicios.map((s) => s.id));
  const { sending, run, messages } = useAction();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await run(() => save(selected), 'Servicios actualizados');
  };

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <SelectorServicios
        services={services}
        selected={selected}
        onChange={setSelected}
        disabled={sending}
      />
      {servicesError && <ErrorMessage>{servicesError}</ErrorMessage>}
      {messages}
      <div className="form-actions">
        <Button type="submit" loading={sending} data-testid="btn-guardar-servicios-odontologo">
          Guardar servicios
        </Button>
      </div>
    </form>
  );
}

function EstadoProfesional({
  odontologo: dentist,
  changeStatus,
}: {
  odontologo: DentistAdminResponse;
  changeStatus: (active: boolean) => Promise<void>;
}) {
  const { sending, run, messages } = useAction();
  const { confirm, dialog } = useConfirm();

  const toggle = async () => {
    if (
      dentist.activo &&
      !(await confirm({
        title: `¿Deshabilitar a ${dentist.nombre}?`,
        message: 'No recibirá nuevas citas; sus citas existentes se conservan.',
        confirmLabel: 'Deshabilitar odontólogo',
      }))
    ) {
      return;
    }
    await run(
      () => changeStatus(!dentist.activo),
      dentist.activo ? 'Odontólogo deshabilitado' : 'Odontólogo habilitado',
    );
  };

  return (
    <section className="card" aria-labelledby="titulo-estado-profesional">
      <div className="card-section">
        <h2 id="titulo-estado-profesional">Estado profesional</h2>
        <div>
          <ActiveBadge active={dentist.activo} activeLabel="Acepta citas" />
        </div>
        <p className="muted">
          Deshabilitado no recibe nuevas citas ni aparece para los pacientes; su historial se
          conserva.
        </p>
      </div>
      {messages}
      <div className="form-actions">
        <Button
          variant={dentist.activo ? 'danger-outline' : 'secondary'}
          loading={sending}
          onClick={() => void toggle()}
          data-testid="btn-cambiar-estado-odontologo"
        >
          {dentist.activo ? 'Deshabilitar odontólogo' : 'Habilitar odontólogo'}
        </Button>
      </div>
      {dialog}
    </section>
  );
}
