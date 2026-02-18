import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from './layouts/header/header.component';
import { FooterComponent } from './layouts/footer/footer.component';
import { CarouselComponent } from "./layouts/landing/carousel/carousel.component";
import { AccountService } from './core/services/account.service';
import { InactivityService } from './core/services/inactivity.service';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    CarouselComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'excise_frontend';
  //showHeaderFooter = true; // Default to showing header/footer
  showCarousel = false;
  private readonly destroy$ = new Subject<void>();

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private inactivityService = inject(InactivityService);
  
  constructor() {
    // Listen for route changes to toggle header/footer visibility
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.updateLayoutVisibility();
    });

  }

  ngOnInit(): void {
    this.accountService.getAuthenticationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.inactivityService.startWatching();
          return;
        }

        this.inactivityService.stopWatching();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.inactivityService.stopWatching();
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
}
