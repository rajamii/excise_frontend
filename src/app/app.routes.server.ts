import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Auth state is stored in browser localStorage, so protected routes
    // must be resolved on the client to avoid hard-refresh redirects.
    renderMode: RenderMode.Client
  }
];
