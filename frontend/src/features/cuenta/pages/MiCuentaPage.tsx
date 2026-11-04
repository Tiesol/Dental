import { useAuth } from '@/features/auth';
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
    <div className="stack">
      <section className="card">
        <h1>Hola, {user.nombre}</h1>
        <dl>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Rol</dt>
          <dd>{ROLE_LABEL[user.role]}</dd>
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
        {estado.status === 'error' && (
          <p className="error" role="alert" data-testid="error-mensaje">
            {estado.mensaje}
          </p>
        )}
      </section>

      {perfil && camposPropios(perfil.role).length > 0 && (
        <FormularioPerfil key={perfil.id} perfil={perfil} guardar={guardar} />
      )}
      <FormularioPassword />
    </div>
  );
}
