import { Component, type ReactNode } from 'react';

interface LimiteErrorProps {
  children: ReactNode;
}

interface LimiteErrorState {
  mensaje: string | null;
}

export class LimiteError extends Component<LimiteErrorProps, LimiteErrorState> {
  override state: LimiteErrorState = { mensaje: null };

  static getDerivedStateFromError(error: unknown): LimiteErrorState {
    return {
      mensaje: error instanceof Error ? error.message : String(error)
    };
  }

  override render(): ReactNode {
    if (this.state.mensaje === null) {
      return this.props.children;
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <section className="panel" role="alert">
          <h1 className="text-xl font-semibold">No se pudo abrir la aplicación</h1>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{this.state.mensaje}</p>
          <button
            className="boton boton-primario mt-5"
            onClick={() => this.setState({ mensaje: null })}
            type="button"
          >
            Reintentar
          </button>
        </section>
      </main>
    );
  }
}
