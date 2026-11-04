import { useEffect, useState } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse } from '@/api/types';

// Servicios para filtros y casillas de selección. El backend decide cuáles ve cada rol
// (el ADMIN también recibe los deshabilitados, para poder asignarlos).
export function useServiciosParaElegir() {
  const [servicios, setServicios] = useState<ServiceResponse[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    servicesApi
      .listar()
      .then((lista) => {
        if (activo) setServicios(lista);
      })
      .catch((err: Error) => {
        if (activo) setError(err.message);
      });
    return () => {
      activo = false;
    };
  }, []);

  return { servicios, error };
}
