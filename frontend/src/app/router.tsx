import { Navigate, Route, Routes } from 'react-router-dom';
import { EditarUsuarioPage, NuevoUsuarioPage, UsuariosPage } from '@/features/admin-usuarios';
import { LoginPage, RegistroPage, RequireRole } from '@/features/auth';
import { MiCuentaPage } from '@/features/cuenta';

// Rutas por rol (ver ARQUITECTURA.md sección 4). Cada grupo va dentro de RequireRole.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route
        path="/"
        element={
          <RequireRole>
            <MiCuentaPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <RequireRole roles={['ADMIN']}>
            <UsuariosPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/usuarios/nuevo"
        element={
          <RequireRole roles={['ADMIN']}>
            <NuevoUsuarioPage />
          </RequireRole>
        }
      />
      <Route
        path="/admin/usuarios/:id"
        element={
          <RequireRole roles={['ADMIN']}>
            <EditarUsuarioPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
