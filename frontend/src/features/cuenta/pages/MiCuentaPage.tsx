import { useAuth } from '@/features/auth';
import { Avatar } from '@/shared/components/Avatar';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { ROLE_LABEL } from '@/shared/lib/roles';
import { FormularioPassword } from '../components/FormularioPassword';
import { FormularioPerfil } from '../components/FormularioPerfil';
import { useMiPerfil } from '../hooks/useMiPerfil';
import { camposPropios } from '../lib/campos-propios';

export function MiCuentaPage() {
  const { user } = useAuth();
  const { estado, guardar } = useMiPerfil();
  if (!user) return null;

  const perfil = estado.status === 'ok' ? estado.perfil : null;

  return (
    <div className="page">
      <PageHeader
        title={`Hola, ${user.nombre}`}
        description="Revisa tus datos y mantén segura tu cuenta."
      />
      <div className="account-grid">
        <section className="card" aria-labelledby="titulo-datos">
          <div className="account-summary-head">
            <Avatar name={user.nombre} large />
            <div>
              <h2 id="titulo-datos">Tus datos</h2>
              <p className="muted">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <dl className="details">
            <dt>Email</dt>
            <dd>{user.email}</dd>
            {perfil?.paciente?.telefono && (
              <>
                <dt>Teléfono</dt>
                <dd>{perfil.paciente.telefono}</dd>
              </>
            )}
            {perfil?.odontologo && (
              <>
                <dt>Especialidad</dt>
                <dd>{perfil.odontologo.especialidad}</dd>
              </>
            )}
            <dt>Miembro desde</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString('es')}</dd>
          </dl>
          {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
        </section>

        <div className="account-forms">
          {estado.status === 'cargando' && <LoadingState />}
          {perfil && camposPropios(perfil.role).length > 0 && (
            <FormularioPerfil key={perfil.id} perfil={perfil} guardar={guardar} />
          )}
          <FormularioPassword />
        </div>
      </div>
    </div>
  );
}
