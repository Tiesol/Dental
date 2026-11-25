import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { App } from './app/App';
// Lexend se sirve desde la propia app (sin Google Fonts). Solo los pesos que usa la interfaz.
import '@fontsource/lexend/400.css';
import '@fontsource/lexend/500.css';
import '@fontsource/lexend/600.css';
import '@fontsource/lexend/700.css';
import './shared/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
