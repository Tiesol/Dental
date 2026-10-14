import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { Header } from './layouts/Header';
import { AppRoutes } from './router';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <AppRoutes />
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
