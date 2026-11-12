import { Component, type ErrorInfo, type ReactNode } from 'react';
import { buildErrorReport, type ErrorReport } from '@/shared/lib/error-report';
import { ErrorDetails } from './ErrorDetails';

type Props = { children: ReactNode };
type State = { report: ErrorReport | null };

// Única clase del frontend: React solo permite capturar errores de render y de efectos con un
// componente de clase. Va en la raíz para que un error nunca deje la pantalla en blanco.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { report: null };

  static getDerivedStateFromError(error: unknown): State {
    return { report: buildErrorReport(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.setState({ report: buildErrorReport(error, info.componentStack) });
  }

  render() {
    if (!this.state.report) return this.props.children;
    return (
      <main className="error-screen">
        <div className="card error-screen-card">
          <ErrorDetails report={this.state.report} />
        </div>
      </main>
    );
  }
}
