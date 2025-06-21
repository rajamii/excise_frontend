import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { Authority } from './shared/constants/authority.enum';
import { UserRouteAccessService } from './core/config/user-route-access.service';
import { HomeComponent } from './layouts/landing/home/home.component';
import { HomeLinksComponent } from './layouts/landing/home/home-links/home-links.component';
import { InfoPagesComponent } from './layouts/footer/info-pages/info-pages.component';

export const routes: Routes = [
  // Landing layout with nested children
  {
    path: '',
    children: [
      {
        path: '',
        component: HomeComponent,
        data: { showCarousel: true }
      },
      {
        path: 'home/:page',
        component: HomeLinksComponent
      }
    ]
  },

  // Information pages (about-us, contact-us, etc.)
  {
    path: 'info',
    children: [
      {
        path: ':page', // Dynamic info pages
        component: InfoPagesComponent
      }
    ]
  },

  // Login route
  {
    path: 'login',
    component: LoginComponent
  },

  // Role Protected modules
  {
    path: 'admin',
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [
        Authority.SITE_ADMIN, 
        Authority.LEVEL_1, 
        Authority.LEVEL_2,
        Authority.LEVEL_3, 
        Authority.LEVEL_4, 
        Authority.LEVEL_5
      ]
    },
    loadChildren: () => import('./features/site-admin/site-admin-routes')
  },

  // Licensee feature module
  {
    path: 'licensee',
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.LICENSEE]
    },
    loadChildren: () =>
      import('./features/licensee/licensee.routes').then((m) => m.licenseeRoutes)
    
  },

  // Wildcard fallback
  {
    path: '**',
    redirectTo: '/',
    pathMatch: 'full'
  }
];

export default routes;
