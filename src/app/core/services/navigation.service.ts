import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { NavigationItem } from '../models/dashboard.models';
import { RoleService } from './role.service';
import { DashboardConfigService } from './dashboard-config.service';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private navigationItemsSubject = new BehaviorSubject<NavigationItem[]>([]);
  public navigationItems$ = this.navigationItemsSubject.asObservable();

  constructor(
    private roleService: RoleService,
    private dashboardConfigService: DashboardConfigService
  ) {
    this.initializeNavigation();
  }

  private initializeNavigation(): void {
    const currentUser = this.roleService.getCurrentUser();
    if (!currentUser) return;

    this.dashboardConfigService.getCurrentUserDashboardConfigCached().subscribe({
      next: (config) => {
        const navigationItems = this.buildNavigationItems(config.navigation);
        this.navigationItemsSubject.next(navigationItems);
      },
      error: (error) => {
        console.error('Error loading navigation config:', error);
        this.navigationItemsSubject.next([]);
      }
    });
  }

  private buildNavigationItems(configNavigation: NavigationItem[]): NavigationItem[] {
    return configNavigation.filter(item => {
      // Check permissions if specified
      if (item.permissions && item.permissions.length > 0) {
        return this.roleService.hasAnyPermission(item.permissions);
      }
      return true;
    }).map(item => ({
      ...item,
      children: item.children ? this.buildNavigationItems(item.children) : undefined
    }));
  }

  getNavigationItems(): NavigationItem[] {
    return this.navigationItemsSubject.value;
  }

  refreshNavigation(): void {
    this.initializeNavigation();
  }

  // Helper method to get navigation items for specific sections
  getNavigationBySection(section: 'main' | 'admin' | 'tools'): NavigationItem[] {
    const allItems = this.getNavigationItems();
    
    switch (section) {
      case 'main':
        return allItems.filter(item => 
          ['Dashboard', 'Applications', 'My Applications'].includes(item.label)
        );
      
      case 'admin':
        return allItems.filter(item => 
          ['Master Data', 'User Management', 'System Settings', 'Reports'].includes(item.label)
        );
      
      case 'tools':
        return allItems.filter(item => 
          ['Hologram Management', 'Payment Management', 'Supply Chain', 'Registrations'].includes(item.label)
        );
      
      default:
        return allItems;
    }
  }

  // Method to check if a route is active
  isRouteActive(route: string, currentRoute: string): boolean {
    if (route === currentRoute) return true;
    
    // Check for parent route matching
    if (currentRoute.startsWith(route + '/')) return true;
    
    return false;
  }

  // Method to get breadcrumbs for current route
  getBreadcrumbs(currentRoute: string): NavigationItem[] {
    const breadcrumbs: NavigationItem[] = [];
    const allItems = this.getNavigationItems();
    
    this.findBreadcrumbPath(allItems, currentRoute, breadcrumbs);
    
    return breadcrumbs;
  }

  private findBreadcrumbPath(
    items: NavigationItem[], 
    targetRoute: string, 
    breadcrumbs: NavigationItem[]
  ): boolean {
    for (const item of items) {
      breadcrumbs.push(item);
      
      if (item.route === targetRoute || this.isRouteActive(item.route, targetRoute)) {
        return true;
      }
      
      if (item.children && this.findBreadcrumbPath(item.children, targetRoute, breadcrumbs)) {
        return true;
      }
      
      breadcrumbs.pop();
    }
    
    return false;
  }
}
