import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { AppRoutes } from './router';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
