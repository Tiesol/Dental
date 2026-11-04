import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Role } from '@/api/types';
import { EditarUsuarioPage, NuevoUsuarioPage, UsuariosPage } from '@/features/admin-usuarios';
import { LoginPage, RegistroPage, RequireRole } from '@/features/auth';
import { MiCuentaPage } from '@/features/cuenta';

// Grupo de rutas protegido: todas sus rutas hijas exigen sesión y, si se indica, uno de los roles.
function Protegidas({ roles }: { roles?: Role[] }) {
  return (
    <RequireRole roles={roles}>
      <Outlet />
    </RequireRole>
  );
}

// Rutas por rol (ver ARQUITECTURA.md sección 4).
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />

      <Route element={<Protegidas />}>
        <Route path="/" element={<MiCuentaPage />} />
      </Route>

      <Route element={<Protegidas roles={['ADMIN']} />}>
        <Route path="/admin/usuarios" element={<UsuariosPage />} />
        <Route path="/admin/usuarios/nuevo" element={<NuevoUsuarioPage />} />
        <Route path="/admin/usuarios/:id" element={<EditarUsuarioPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
