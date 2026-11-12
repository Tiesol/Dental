import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { ErrorMessage } from '@/shared/components/ErrorMessage';
import { PageHeader } from '@/shared/components/PageHeader';
import { TextField } from '@/shared/components/TextField';
import { useForm } from '@/shared/hooks/useForm';
import { combine, email, maxLength, minLength, required } from '@/shared/lib/validators';
import { SelectorServicios } from '../components/SelectorServicios';
import { useCrearOdontologo } from '../hooks/useCrearOdontologo';
import { useServiciosParaElegir } from '../hooks/useServiciosParaElegir';

// Registro de un odontólogo: cuenta de acceso + datos profesionales + servicios, en un solo paso.
export function NuevoOdontologoPage() {
  const navigate = useNavigate();
  const crear = useCrearOdontologo();
  const { servicios, error: errorServicios } = useServiciosParaElegir();
  const form = useForm(
    { nombre: '', especialidad: '', email: '', password: '' },
    {
      nombre: required('Escribe el nombre'),
      especialidad: required('Escribe la especialidad'),
      email: combine(required('Escribe el email'), email()),
      password: combine(
        required('Escribe una contraseña inicial'),
        minLength(8, 'La contraseña debe tener al menos 8 caracteres'),
        maxLength(72, 'La contraseña admite hasta 72 caracteres'),
      ),
    },
  );
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.validate()) return;
    const { nombre, especialidad, email: correo, password } = form.values;
    setEnviando(true);
    try {
      await crear({
        nombre: nombre.trim(),
        especialidad: especialidad.trim(),
        email: correo.trim(),
        password,
        serviceIds,
      });
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
      <form className="card" onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <TextField
            {...form.field('nombre')}
            label="Nombre"
            maxLength={100}
            placeholder="Dr. Juan Rojas"
          />
          <TextField
            {...form.field('especialidad')}
            label="Especialidad"
            maxLength={100}
            placeholder="Ortodoncia"
          />
        </div>
        <SelectorServicios
          servicios={servicios}
          seleccionados={serviceIds}
          onChange={setServiceIds}
        />
        {errorServicios && <ErrorMessage>{errorServicios}</ErrorMessage>}
        <TextField
          {...form.field('email')}
          label="Email (para iniciar sesión)"
          type="email"
          autoComplete="off"
        />
        <TextField
          {...form.field('password')}
          label="Contraseña inicial"
          type="password"
          autoComplete="new-password"
          hint="De 8 a 72 caracteres. El odontólogo podrá cambiarla en Mi cuenta."
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="form-actions">
          <Button type="submit" loading={enviando} data-testid="btn-crear-odontologo">
            Registrar odontólogo
          </Button>
        </div>
      </form>
    </div>
  );
}
