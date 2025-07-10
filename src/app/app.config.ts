import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CsrfInterceptor } from './core/interceptors/csrfInterceptor';
import { provideToastr, ToastrModule } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MarkdownModule } from 'ngx-markdown';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    provideToastr(),
    provideAnimations(),

    // ✅ ADD THIS TO FIX _MarkdownService injection
    importProvidersFrom(
      HttpClientModule,
      MarkdownModule.forRoot()
    ),

    // Keep interceptor last
    { provide: HTTP_INTERCEPTORS, useClass: CsrfInterceptor, multi: true },
  ]
};
