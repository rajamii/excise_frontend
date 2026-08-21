import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
  withFetch
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { MarkdownModule } from 'ngx-markdown';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtRefreshInterceptor } from './core/interceptors/jwt-refresh.interceptor';
import { ReadApiCacheInterceptor } from './core/interceptors/read-api-cache.interceptor';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { uiLoadingInterceptorFn } from './core/interceptors/ui-loading.interceptor-fn';
import { CsrfInterceptor } from './core/interceptors/csrf.interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'; // ✅ Added for Chart.js

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([uiLoadingInterceptorFn]), withInterceptorsFromDi()),
    provideAnimationsAsync(),
    provideToastr(),

    // ✅ No need for deprecated HttpClientModule
    importProvidersFrom(
      MarkdownModule.forRoot()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtRefreshInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: CsrfInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ReadApiCacheInterceptor, multi: true },
    
    // ✅ Chart.js configuration (registered once)
    provideCharts(withDefaultRegisterables()),
  ]
};
