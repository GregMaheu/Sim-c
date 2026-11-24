import https from 'node:https';
import { readFileSync } from 'node:fs';
import { runAgent } from './agent.mjs';

const files = new Map([
  ['/', ['text/html; charset=utf-8', 'index.html']],
  ['/app.js', ['text/javascript; charset=utf-8', 'app.js']],
  ['/style.css', ['text/css; charset=utf-8', 'style.css']],
].map(([path, [type, file]]) => [path, [type, readFileSync(new URL('./public/' + file, import.meta.url))]]));

export function createServer(tls, { model, limit = 20 } = {}) {
  let attempts = [];
  let pending = 0;
  return https.createServer({ ...tls, minVersion: 'TLSv1.2', requestTimeout: 12000, headersTimeout: 10000 }, async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    const port = req.socket.localPort;
    const allowedHosts = [`localhost:${port}`, `127.0.0.1:${port}`];
    if (!allowedHosts.includes(req.headers.host)) return json(403, { error: 'Use the local HTTPS address.' });

    if (req.method === 'GET' && files.has(req.url)) {
      const [type, content] = files.get(req.url);
      res.writeHead(200, { 'Content-Type': type });
      return res.end(content);
    }
    if (req.url !== '/api/ask') return json(404, { error: 'Page not found.' });
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(405, { error: 'Use POST for agent requests.' });
    }
    if (req.headers.origin !== `https://${req.headers.host}`) {
      return json(403, { error: 'Request origin must match the local HTTPS interface.' });
    }
    if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return json(415, { error: 'Use application/json.' });
    }
    const now = Date.now();
    attempts = attempts.filter(time => now - time < 60000);
    if (attempts.length >= limit || pending >= 2) {
      res.setHeader('Retry-After', '60');
      return json(429, { error: 'Too many requests. Try again shortly.' });
    }
    attempts.push(now);
    pending++;
    try {
      const chunks = [];
      let bytes = 0;
      const maxBytes = 4096;
      req.setTimeout(5000, () => req.destroy());
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          res.setHeader('Connection', 'close');
          return json(413, { error: 'Request exceeds 4 KB.' });
        }
        chunks.push(chunk);
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return json(400, { error: 'Send valid JSON.' });
      }
      const message = typeof input?.message === 'string' ? input.message.trim() : '';
      if (!message || message.length > 500) return json(400, { error: 'Enter a request of 1 to 500 characters.' });
      return json(200, await runAgent(message, model));
    } catch {
      if (!res.destroyed) json(500, { error: 'The inventory assistant could not complete this request.' });
    } finally {
      pending--;
    }
  });
}
