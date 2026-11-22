import { VERSION } from '@transcriptor/core';

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Transcriptor de Partituras</h1>
        <p className="mt-4 text-lg text-slate-300" role="status" aria-live="polite">
          Motor {VERSION} en preparación. La interfaz llegará en la Fase 4.
        </p>
      </div>
    </main>
  );
}
