import { useAuth } from '@/features/auth';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { LoadingState } from '@/shared/components/LoadingState';
import { PageHeader } from '@/shared/components/PageHeader';
import { FormularioPassword } from '../components/FormularioPassword';
import { FormularioPerfil } from '../components/FormularioPerfil';
import { useMiPerfil } from '../hooks/useMiPerfil';
import { camposPropios } from '../lib/campos-propios';

// El email no se edita aquí (lo gestiona el ADMIN), así que solo se muestra en el encabezado.
export function MiCuentaPage() {
  const { user } = useAuth();
  const { estado, guardar } = useMiPerfil();
  if (!user) return null;

  const perfil = estado.status === 'ok' ? estado.perfil : null;

  return (
    <div className="page page-narrow">
      <PageHeader title="Mi cuenta" description={`Sesión iniciada como ${user.email}`} />
      {estado.status === 'cargando' && <LoadingState />}
      {estado.status === 'error' && <ErrorMessage>{estado.mensaje}</ErrorMessage>}
      {perfil && camposPropios(perfil.role).length > 0 && (
        <FormularioPerfil key={perfil.id} perfil={perfil} guardar={guardar} />
      )}
      <FormularioPassword />
    </div>
  );
}
