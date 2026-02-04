import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DashboardConfig, DashboardWidget, NavigationItem } from '../models/dashboard.models';
import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardConfigService {

  constructor(private roleService: RoleService) {}

  getDashboardConfig(roleId: number): Observable<DashboardConfig> {
    const config = this.ROLE_DASHBOARD_CONFIGS[roleId];
    if (!config) {
      throw new Error(`Dashboard configuration not found for role ID: ${roleId}`);
    }
    return of(config);
  }

  getCurrentUserDashboardConfig(): Observable<DashboardConfig> {
    const currentUser = this.roleService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No current user found');
    }
    return this.getDashboardConfig(currentUser.roleId);
  }

  private readonly ROLE_DASHBOARD_CONFIGS: { [roleId: number]: DashboardConfig } = {
    // Site Admin (ID: 2)
    2: {
      roleId: 2,
      roleName: 'Site Administrator',
      layout: 'admin',
      permissions: ['dashboard.view', 'applications.view', 'system.view'],
      widgets: [
        {
          id: 'admin-stats',
          type: 'stats-overview',
          title: 'Application Overview',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['applications.view'],
          data: { 
            endpoint: '/api/admin/dashboard/stats',
            refreshInterval: 300 
          },
          config: { 
            showHeader: true, 
            showRefresh: true 
          }
        },
        {
          id: 'admin-chart',
          type: 'chart-widget',
          title: 'Application Statistics',
          position: { row: 2, col: 1, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['applications.view'],
          data: { 
            endpoint: '/api/admin/dashboard/chart-data',
            refreshInterval: 600 
          },
          config: { 
            showHeader: true, 
            showRefresh: true, 
            showFullscreen: true 
          }
        },
        {
          id: 'admin-table',
          type: 'table-widget',
          title: 'Recent Applications',
          position: { row: 2, col: 3, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['applications.view'],
          data: { 
            endpoint: '/api/admin/dashboard/recent-applications',
            refreshInterval: 180 
          },
          config: { 
            showHeader: true, 
            showRefresh: true, 
            showExport: true 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Applications', route: '/applications', icon: 'apps' },
        { label: 'Master Data', route: '/admin/master', icon: 'settings' },
        { label: 'User Management', route: '/admin/users', icon: 'people' },
        { label: 'Reports', route: '/reports', icon: 'assessment' },
        { label: 'System Settings', route: '/admin/settings', icon: 'admin_panel_settings' }
      ]
    },

    // Commissioner (ID: 10)
    10: {
      roleId: 10,
      roleName: 'Commissioner',
      layout: 'commissioner',
      permissions: ['dashboard.view', 'applications.view', 'hologram.manage'],
      widgets: [
        {
          id: 'commissioner-stats',
          type: 'stats-overview',
          title: 'License Applications Overview',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['applications.view'],
          data: { 
            endpoint: '/api/commissioner/dashboard/stats',
            refreshInterval: 300 
          }
        },
        {
          id: 'hologram-management',
          type: 'table-widget',
          title: 'Hologram Management',
          position: { row: 2, col: 1, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['hologram.manage'],
          data: { 
            endpoint: '/api/commissioner/hologram/requests',
            refreshInterval: 300 
          }
        },
        {
          id: 'payment-overview',
          type: 'table-widget',
          title: 'Payment Overview',
          position: { row: 2, col: 3, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['payment.manage'],
          data: { 
            endpoint: '/api/commissioner/payments/overview',
            refreshInterval: 600 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Applications', route: '/applications', icon: 'apps' },
        { label: 'Hologram Management', route: '/admin/commissioner/hologram', icon: 'security' },
        { label: 'Payment Management', route: '/admin/commissioner/payments', icon: 'payment' },
        { label: 'Reports', route: '/reports', icon: 'assessment' }
      ]
    },

    // Level 1 Officer (ID: 11)
    11: {
      roleId: 11,
      roleName: 'Level 1 Officer',
      layout: 'admin',
      permissions: ['dashboard.view', 'applications.view', 'applications.process'],
      widgets: [
        {
          id: 'level1-stats',
          type: 'stats-overview',
          title: 'Application Processing Overview',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['applications.view'],
          data: { 
            endpoint: '/api/level1/dashboard/stats',
            refreshInterval: 180 
          }
        },
        {
          id: 'pending-applications',
          type: 'table-widget',
          title: 'Pending Applications',
          position: { row: 2, col: 1, colspan: 4 },
          size: { width: 'full', height: 'large' },
          permissions: ['applications.process'],
          data: { 
            endpoint: '/api/level1/applications/pending',
            refreshInterval: 120 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Applications', route: '/applications', icon: 'apps' },
        { label: 'Reports', route: '/reports', icon: 'assessment' }
      ]
    },

    // IT Cell (ID: 12)
    12: {
      roleId: 12,
      roleName: 'IT Cell',
      layout: 'admin',
      permissions: ['dashboard.view', 'system.view', 'users.view'],
      widgets: [
        {
          id: 'system-stats',
          type: 'stats-overview',
          title: 'System Statistics',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['system.view'],
          data: { 
            endpoint: '/api/it-cell/dashboard/system-stats',
            refreshInterval: 60 
          }
        },
        {
          id: 'user-activity',
          type: 'table-widget',
          title: 'User Activity',
          position: { row: 2, col: 1, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['logs.view'],
          data: { 
            endpoint: '/api/it-cell/user-activity',
            refreshInterval: 300 
          }
        },
        {
          id: 'system-health',
          type: 'chart-widget',
          title: 'System Health',
          position: { row: 2, col: 3, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['system.monitor'],
          data: { 
            endpoint: '/api/it-cell/system-health',
            refreshInterval: 120 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'System Monitor', route: '/admin/it-cell/monitor', icon: 'monitor' },
        { label: 'User Management', route: '/admin/master/user', icon: 'people' },
        { label: 'System Logs', route: '/admin/it-cell/logs', icon: 'list_alt' }
      ]
    },

    // Permit Section (ID: 9)
    9: {
      roleId: 9,
      roleName: 'Permit Section',
      layout: 'permit-section',
      permissions: ['dashboard.view', 'permits.view', 'requisition.view'],
      widgets: [
        {
          id: 'permit-stats',
          type: 'stats-overview',
          title: 'Permit Statistics',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['permits.view'],
          data: { 
            endpoint: '/api/permit-section/dashboard/stats',
            refreshInterval: 300 
          }
        },
        {
          id: 'requisition-table',
          type: 'table-widget',
          title: 'Requisition Register',
          position: { row: 2, col: 1, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['requisition.view'],
          data: { 
            endpoint: '/api/permit-section/requisitions',
            refreshInterval: 180 
          }
        },
        {
          id: 'transit-permits',
          type: 'table-widget',
          title: 'Transit Permits',
          position: { row: 2, col: 3, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['transit.view'],
          data: { 
            endpoint: '/api/permit-section/transit-permits',
            refreshInterval: 300 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Requisition', route: '/admin/permit-section/requisition', icon: 'receipt' },
        { label: 'Revalidation', route: '/admin/permit-section/revalidation', icon: 'refresh' },
        { label: 'Cancellation', route: '/admin/permit-section/cancellation', icon: 'cancel' },
        { label: 'Transit', route: '/admin/permit-section/transit', icon: 'local_shipping' }
      ]
    },

    // Officer in Charge (ID: 18)
    18: {
      roleId: 18,
      roleName: 'Officer in Charge',
      layout: 'admin',
      permissions: ['dashboard.view', 'hologram.view', 'applications.view'],
      widgets: [
        {
          id: 'oic-stats',
          type: 'stats-overview',
          title: 'OIC Dashboard Overview',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['applications.view'],
          data: { 
            endpoint: '/api/oic/dashboard/stats',
            refreshInterval: 300 
          }
        },
        {
          id: 'hologram-requests',
          type: 'table-widget',
          title: 'Hologram Requests',
          position: { row: 2, col: 1, colspan: 4 },
          size: { width: 'full', height: 'large' },
          permissions: ['hologram.view'],
          data: { 
            endpoint: '/api/oic/hologram/requests',
            refreshInterval: 180 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Hologram Requests', route: '/admin/officer-in-charge/hologram', icon: 'security' },
        { label: 'Applications', route: '/applications', icon: 'apps' },
        { label: 'Reports', route: '/reports', icon: 'assessment' }
      ]
    },

    // Supply Chain (ID: 8)
    8: {
      roleId: 8,
      roleName: 'Supply Chain',
      layout: 'licensee',
      permissions: ['dashboard.view', 'licensee.applications.view', 'supply_chain.view'],
      widgets: [
        {
          id: 'licensee-stats',
          type: 'stats-overview',
          title: 'My Applications',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['licensee.applications.view'],
          data: { 
            endpoint: '/api/licensee/dashboard/stats',
            refreshInterval: 300 
          }
        },
        {
          id: 'supply-chain-table',
          type: 'table-widget',
          title: 'Supply Chain Activities',
          position: { row: 2, col: 1, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['supply_chain.view'],
          data: { 
            endpoint: '/api/licensee/supply-chain/activities',
            refreshInterval: 300 
          }
        },
        {
          id: 'recent-applications',
          type: 'table-widget',
          title: 'Recent Applications',
          position: { row: 2, col: 3, colspan: 2 },
          size: { width: 'large', height: 'large' },
          permissions: ['licensee.applications.view'],
          data: { 
            endpoint: '/api/licensee/applications/recent',
            refreshInterval: 300 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'New License', route: '/licensee/apply-new-license', icon: 'add_circle' },
        { label: 'Supply Chain', route: '/licensee/supply-chain', icon: 'link' },
        { label: 'Registrations', route: '/licensee/registrations', icon: 'app_registration' },
        { label: 'Payments', route: '/licensee/payments', icon: 'payment' }
      ]
    },

    // Licensee (ID: 19)
    19: {
      roleId: 19,
      roleName: 'Licensee',
      layout: 'licensee',
      permissions: ['dashboard.view', 'licensee.applications.view'],
      widgets: [
        {
          id: 'licensee-basic-stats',
          type: 'stats-overview',
          title: 'My License Status',
          position: { row: 1, col: 1, colspan: 4 },
          size: { width: 'full', height: 'medium' },
          permissions: ['licensee.applications.view'],
          data: { 
            endpoint: '/api/licensee/dashboard/basic-stats',
            refreshInterval: 600 
          }
        },
        {
          id: 'my-applications',
          type: 'table-widget',
          title: 'My Applications',
          position: { row: 2, col: 1, colspan: 4 },
          size: { width: 'full', height: 'large' },
          permissions: ['licensee.applications.view'],
          data: { 
            endpoint: '/api/licensee/applications',
            refreshInterval: 300 
          }
        }
      ],
      navigation: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Apply License', route: '/licensee/apply-license', icon: 'add_circle_outline' },
        { label: 'My Applications', route: '/licensee/applications', icon: 'apps' },
        { label: 'Profile', route: '/licensee/profile', icon: 'person' }
      ]
    }
  };

  // Helper methods
  getWidgetsByRole(roleId: number): DashboardWidget[] {
    const config = this.ROLE_DASHBOARD_CONFIGS[roleId];
    return config?.widgets || [];
  }

  getNavigationByRole(roleId: number): NavigationItem[] {
    const config = this.ROLE_DASHBOARD_CONFIGS[roleId];
    return config?.navigation || [];
  }

  getLayoutByRole(roleId: number): string {
    const config = this.ROLE_DASHBOARD_CONFIGS[roleId];
    return config?.layout || 'admin';
  }
}