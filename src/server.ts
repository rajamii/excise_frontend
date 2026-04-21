import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import 'zone.js/node';

import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

function getBackendBaseUrl(): string {
  const raw = process.env['BACKEND_BASE_URL'] || process.env['API_BASE_URL'] || 'http://127.0.0.1:8000';
  return String(raw).replace(/\/+$/, '');
}

function proxyToBackend(pathPrefix: string) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const backendBase = getBackendBaseUrl();
      const targetUrl = new URL(req.originalUrl, backendBase);

      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (key.toLowerCase() === 'host') continue;
        if (Array.isArray(value)) headers[key] = value.join(', ');
        else headers[key] = String(value);
      }

      const method = req.method.toUpperCase();
      const body = method === 'GET' || method === 'HEAD' ? undefined : (req as any);

      const upstream = await fetch(targetUrl, {
        method,
        headers,
        body,
        redirect: 'manual',
      });

      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        // Avoid leaking hop-by-hop / incompatible headers.
        if (key.toLowerCase() === 'transfer-encoding') return;
        res.setHeader(key, value);
      });

      if (!upstream.body) {
        res.end();
        return;
      }

      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Proxy Django-served static/media files when running behind a single origin (SSR).
 * This prevents the Angular router from capturing `/media/**` (and returning the SPA 404)
 * when the reverse-proxy doesn't explicitly route media paths to the backend.
 *
 * Configure backend via env `BACKEND_BASE_URL`, e.g. `https://sems.sikkim.gov.in` or `http://10.182.154.196:8000`.
 */
app.use('/media', proxyToBackend('/media'));
app.use('/static', proxyToBackend('/static'));

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
