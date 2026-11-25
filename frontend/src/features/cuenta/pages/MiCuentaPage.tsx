import { useAuth } from '@/features/auth';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { FormularioPassword } from '../components/FormularioPassword';
import { FormularioPerfil } from '../components/FormularioPerfil';
import { useMyProfile } from '../hooks/useMyProfile';
import { ownFields } from '../lib/own-fields';

// El email no se edita aquí (lo gestiona el ADMIN), así que solo se muestra en el encabezado.
export function MiCuentaPage() {
  const { user } = useAuth();
  const { state, save } = useMyProfile();
  if (!user) return null;

  const profile = state.status === 'ok' ? state.profile : null;

  return (
    <div className="page page-narrow">
      <PageHeader title="Mi cuenta" description={`Sesión iniciada como ${user.email}`} />
      {state.status === 'cargando' && <LoadingState />}
      {state.status === 'error' && <ErrorMessage>{state.message}</ErrorMessage>}
      {profile && ownFields(profile.role).length > 0 && (
        <FormularioPerfil key={profile.id} profile={profile} save={save} />
      )}
      <FormularioPassword />
    </div>
  );
}
