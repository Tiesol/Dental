import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Role } from '@/api/types';
import { AdminCitasPage } from '@/features/admin-citas';
import { EditarUsuarioPage, NuevoUsuarioPage, UsuariosPage } from '@/features/admin-usuarios';
import { AgendaPage, DetalleAtencionPage } from '@/features/agenda';
import { LoginPage, RegistroPage, RequireRole, useAuth } from '@/features/auth';
import { MiCuentaPage } from '@/features/cuenta';
import { DetalleCitaPage, MisCitasPage } from '@/features/mis-citas';
import {
  AdminOdontologosPage,
  EditarOdontologoPage,
  HorariosOdontologoPage,
  NuevoOdontologoPage,
  OdontologosPage,
} from '@/features/odontologos';
import { ReservaPage } from '@/features/reserva';
import {
  AdminServiciosPage,
  CatalogoServiciosPage,
  EditarServicioPage,
  NuevoServicioPage,
} from '@/features/servicios';
import { HOME_BY_ROLE } from '@/shared/lib/roles';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Grupo de rutas protegido: todas sus rutas hijas exigen sesión y, si se indica, uno de los roles.
function Protegidas({ roles }: { roles?: Role[] }) {
  return (
    <RequireRole roles={roles}>
      <Outlet />
    </RequireRole>
  );
}

// La raíz no tiene pantalla propia: lleva a cada rol a su pantalla principal.
function Inicio() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

// Rutas por rol (ver ARQUITECTURA.md sección 4).
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
      </Route>

      <Route element={<Protegidas />}>
        <Route path="/" element={<Inicio />} />
        <Route element={<AppLayout />}>
          <Route path="/mi-cuenta" element={<MiCuentaPage />} />

          <Route element={<Protegidas roles={['PACIENTE']} />}>
            <Route path="/servicios" element={<CatalogoServiciosPage />} />
            <Route path="/odontologos" element={<OdontologosPage />} />
            <Route path="/reservar" element={<ReservaPage />} />
            <Route path="/mis-citas" element={<MisCitasPage />} />
            <Route path="/mis-citas/:id" element={<DetalleCitaPage />} />
          </Route>

          <Route element={<Protegidas roles={['ODONTOLOGO']} />}>
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/agenda/:id" element={<DetalleAtencionPage />} />
          </Route>

          <Route element={<Protegidas roles={['ADMIN']} />}>
            <Route path="/admin/citas" element={<AdminCitasPage />} />
            <Route path="/admin/usuarios" element={<UsuariosPage />} />
            <Route path="/admin/usuarios/nuevo" element={<NuevoUsuarioPage />} />
            <Route path="/admin/usuarios/:id" element={<EditarUsuarioPage />} />
            <Route path="/admin/servicios" element={<AdminServiciosPage />} />
            <Route path="/admin/servicios/nuevo" element={<NuevoServicioPage />} />
            <Route path="/admin/servicios/:id" element={<EditarServicioPage />} />
            <Route path="/admin/odontologos" element={<AdminOdontologosPage />} />
            <Route path="/admin/odontologos/nuevo" element={<NuevoOdontologoPage />} />
            <Route path="/admin/odontologos/:id" element={<EditarOdontologoPage />} />
            <Route path="/admin/odontologos/:id/horarios" element={<HorariosOdontologoPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
