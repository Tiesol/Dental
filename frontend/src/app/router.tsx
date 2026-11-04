import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Role } from '@/api/types';
import { EditarUsuarioPage, NuevoUsuarioPage, UsuariosPage } from '@/features/admin-usuarios';
import { LoginPage, RegistroPage, RequireRole } from '@/features/auth';
import { MiCuentaPage } from '@/features/cuenta';
import {
  AdminOdontologosPage,
  EditarOdontologoPage,
  NuevoOdontologoPage,
  OdontologosPage,
} from '@/features/odontologos';
import {
  AdminServiciosPage,
  CatalogoServiciosPage,
  EditarServicioPage,
  NuevoServicioPage,
} from '@/features/servicios';

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

      <Route element={<Protegidas roles={['PACIENTE']} />}>
        <Route path="/servicios" element={<CatalogoServiciosPage />} />
        <Route path="/odontologos" element={<OdontologosPage />} />
      </Route>

      <Route element={<Protegidas roles={['ADMIN']} />}>
        <Route path="/admin/usuarios" element={<UsuariosPage />} />
        <Route path="/admin/usuarios/nuevo" element={<NuevoUsuarioPage />} />
        <Route path="/admin/usuarios/:id" element={<EditarUsuarioPage />} />
        <Route path="/admin/servicios" element={<AdminServiciosPage />} />
        <Route path="/admin/servicios/nuevo" element={<NuevoServicioPage />} />
        <Route path="/admin/servicios/:id" element={<EditarServicioPage />} />
        <Route path="/admin/odontologos" element={<AdminOdontologosPage />} />
        <Route path="/admin/odontologos/nuevo" element={<NuevoOdontologoPage />} />
        <Route path="/admin/odontologos/:id" element={<EditarOdontologoPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
