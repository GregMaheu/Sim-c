import { readFileSync } from 'node:fs';
import { createServer } from './server.mjs';

function readTls(file) {
  return readFileSync(new URL('./.tls/' + file, import.meta.url));
}

let tls;
try {
  tls = { cert: readTls('localhost.pem'), key: readTls('localhost-key.pem') };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.error('Run pwsh -NoProfile -File ./setup-tls.ps1 before starting Sim-C.');
  process.exit(1);
}

const port = Number(process.env.SIMC_PORT ?? 8443);
const server = createServer(tls, { model: process.env.SIMC_OLLAMA_MODEL });
server.listen(port, '127.0.0.1', () => {
  console.log(`Sim-C is available at https://127.0.0.1:${server.address().port}/`);
});
