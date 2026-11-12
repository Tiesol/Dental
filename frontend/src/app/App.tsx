import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { GlobalErrorNotice } from '@/shared/components/GlobalErrorNotice';
import { AppRoutes } from './router';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <GlobalErrorNotice />
    </AuthProvider>
  );
}
