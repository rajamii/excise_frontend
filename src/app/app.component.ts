import { Component, OnDestroy, OnInit, inject, HostListener, DOCUMENT } from '@angular/core';
import {
  Router,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  RouterOutlet,
  ActivatedRoute
} from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { HeaderComponent } from './layouts/header/header.component';
import { FooterComponent } from './layouts/footer/footer.component';
import { CarouselComponent } from "./layouts/landing/carousel/carousel.component";
import { AccountService } from './core/services/account.service';
import { InactivityService } from './core/services/inactivity.service';
import { Subject, filter, takeUntil } from 'rxjs';
import { MaterialModule } from './shared/material.module';
import { UiLoadingService } from './core/services/ui-loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MaterialModule,
    HeaderComponent,
    FooterComponent,
    CarouselComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'excise_frontend';
  showCarousel = false;
  isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  isLoginRoute = false;  // tracks if we're on /login so we can show the back button
  isForgotPasswordRoute = false; // tracks if we're on /forgot-password to hide layout chrome

  @HostListener('window:offline')
  setNetworkOffline() {
    this.isOffline = true;
  }

  @HostListener('window:online')
  setNetworkOnline() {
    this.isOffline = false;
  }
  private readonly destroy$ = new Subject<void>();

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private inactivityService = inject(InactivityService);
  private dialog = inject(MatDialog);
  readonly loading = inject(UiLoadingService);
  private wasAuthenticated = false;
  private doc = inject(DOCUMENT);
  
  constructor() {
    // Listen for route changes to toggle header/footer visibility
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.updateLayoutVisibility();
      const path = this.normalizePath(this.router.url);
      this.isLoginRoute = path.startsWith('/login');
      this.isForgotPasswordRoute = path.startsWith('/forgot-password');
      // Toggle body class for login-specific dark background
      if (this.isLoginRoute || this.isForgotPasswordRoute) {
        this.doc.body.classList.add('login-page');
      } else {
        this.doc.body.classList.remove('login-page');
      }
    });

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          if (this.shouldShowRouteLoader(event.url)) this.loading.setRouteLoading(true);
        }
        if (event instanceof NavigationEnd) this.loading.setRouteLoading(false);
        if (event instanceof NavigationCancel) this.loading.setRouteLoading(false);
        if (event instanceof NavigationError) this.loading.setRouteLoading(false);
      });

  }

  ngOnInit(): void {
    this.accountService.getAuthenticationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          const isOnLoginScreen = this.normalizePath(this.router.url).startsWith('/login');
          const resetStoredActivity = !this.wasAuthenticated && isOnLoginScreen;
          this.wasAuthenticated = true;
          this.inactivityService.startWatching(resetStoredActivity);
          return;
        }

        // Ensure stale dialogs from previous protected screens are removed
        // when session expires and app navigates to login.
        this.dialog.closeAll();
        this.wasAuthenticated = false;
        this.inactivityService.stopWatching();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.inactivityService.stopWatching();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  private updateLayoutVisibility() {
    let currentRoute = this.route.firstChild;
    while (currentRoute?.firstChild) {
      currentRoute = currentRoute.firstChild; // Drill down to the deepest active route
    }

    // Fallback to default values if data is not defined
    //this.showHeaderFooter = currentRoute?.snapshot.data?.['showHeaderFooter'] ?? true;
    this.showCarousel = currentRoute?.snapshot.data?.['showCarousel'] ?? false;



  
  }

  private shouldShowRouteLoader(targetUrl: string): boolean {
    const currentPath = this.normalizePath(this.router.url);
    const nextPath = this.normalizePath(targetUrl);

    // Inside user dashboard we switch sections frequently (sidebar/query params);
    // avoid showing the full-screen route loader for these in-dashboard navigations.
    const isInDashboardNav = currentPath.startsWith('/dashboard') && nextPath.startsWith('/dashboard');
    return !isInDashboardNav;
  }

  private normalizePath(url: string): string {
    const withoutHash = (url ?? '').split('#')[0] ?? '';
    const withoutQuery = withoutHash.split('?')[0] ?? '';
    return withoutQuery.trim();
  }
}
