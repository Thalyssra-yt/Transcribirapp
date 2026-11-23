#!/usr/bin/env node
import { ejecutarComando } from './comandos.js';

try {
  const { texto } = ejecutarComando(process.argv.slice(2));
  for (const linea of texto) {
    console.log(linea);
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
