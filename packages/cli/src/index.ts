const COMANDOS = ['instrumentos', 'info', 'transponer', 'rango'] as const;

const [comando] = process.argv.slice(2);

if (!comando || !COMANDOS.includes(comando as (typeof COMANDOS)[number])) {
  console.log('Uso: partitura <instrumentos|info|transponer|rango>');
  process.exitCode = 1;
} else {
  console.log(`Comando ${comando} pendiente de implementar en la Fase 3.`);
}
