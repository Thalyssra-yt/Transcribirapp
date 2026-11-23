import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LimiteError } from './components/LimiteError';
import './styles.css';

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error('No se encontró el elemento root');
}

createRoot(contenedor).render(
  <StrictMode>
    <LimiteError>
      <App />
    </LimiteError>
  </StrictMode>
);
