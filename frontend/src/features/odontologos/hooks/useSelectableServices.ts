import { useEffect, useState } from 'react';
import { servicesApi } from '@/api/endpoints/services';
import type { ServiceResponse } from '@/api/types';

// Servicios para filtros y casillas de selección. El backend decide cuáles ve cada rol
// (el ADMIN también recibe los deshabilitados, para poder asignarlos).
export function useSelectableServices() {
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    servicesApi
      .list()
      .then((list) => {
        if (active) setServices(list);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return { services, error };
}
