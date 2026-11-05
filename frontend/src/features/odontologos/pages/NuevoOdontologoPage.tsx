import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { PageHeader } from '@/shared/components/PageHeader';
import { SelectorServicios } from '../components/SelectorServicios';
import { useCrearOdontologo } from '../hooks/useCrearOdontologo';
import { useServiciosParaElegir } from '../hooks/useServiciosParaElegir';

// Registro de un odontólogo: cuenta de acceso + datos profesionales + servicios, en un solo paso.
export function NuevoOdontologoPage() {
  const navigate = useNavigate();
  const crear = useCrearOdontologo();
  const { servicios, error: errorServicios } = useServiciosParaElegir();
  const [form, setForm] = useState({ nombre: '', especialidad: '', email: '', password: '' });
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const update = (campo: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [campo]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await crear({ ...form, serviceIds });
      navigate('/admin/odontologos');
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        title="Nuevo odontólogo"
        description="Crea su cuenta de acceso y define los servicios que realiza."
        back={{ to: '/admin/odontologos', label: 'Volver al listado' }}
      />
      <form className="card" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => update('nombre')(e.target.value)}
              required
              maxLength={100}
              placeholder="Dr. Juan Rojas"
            />
          </label>
          <label>
            Especialidad
            <input
              value={form.especialidad}
              onChange={(e) => update('especialidad')(e.target.value)}
              required
              maxLength={100}
              placeholder="Ortodoncia"
            />
          </label>
        </div>
        <SelectorServicios
          servicios={servicios}
          seleccionados={serviceIds}
          onChange={setServiceIds}
        />
        {errorServicios && <ErrorMessage>{errorServicios}</ErrorMessage>}
        <label>
          Email (para iniciar sesión)
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label>
          Contraseña inicial
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password')(e.target.value)}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
          <small className="muted">
            De 8 a 72 caracteres. El odontólogo podrá cambiarla en Mi cuenta.
          </small>
        </label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <button type="submit" disabled={enviando} data-testid="btn-crear-odontologo">
            {enviando ? 'Registrando…' : 'Registrar odontólogo'}
          </button>
        </div>
      </form>
    </div>
  );
}
