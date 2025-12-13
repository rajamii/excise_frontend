import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { MarkdownModule } from 'ngx-markdown';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtRefreshInterceptor } from './core/interceptors/jwt-refresh.interceptor';
import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'; // ✅ Added for Chart.js

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideAnimationsAsync(),
    provideAnimations(),
    provideToastr(),

    // ✅ No need for deprecated HttpClientModule
    importProvidersFrom(
      MarkdownModule.forRoot()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtRefreshInterceptor, multi: true },
    
    // ✅ Chart.js configuration
    provideCharts(withDefaultRegisterables()),
  ]
};