import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardConfigService } from './dashboard-config.service';
import { RoleService } from './role.service';
import { User } from '../models/role.models';

describe('DashboardConfigService', () => {
  let service: DashboardConfigService;
  let roleService: jasmine.SpyObj<RoleService>;

  beforeEach(() => {
    const roleServiceSpy = jasmine.createSpyObj('RoleService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      providers: [
        DashboardConfigService,
        { provide: RoleService, useValue: roleServiceSpy }
      ]
    });

    service = TestBed.inject(DashboardConfigService);
    roleService = TestBed.inject(RoleService) as jasmine.SpyObj<RoleService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Dashboard Configuration', () => {
    it('should get dashboard config for site admin', (done) => {
      service.getDashboardConfig(2).subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.roleId).toBe(2);
        expect(config.roleName).toBe('Site Administrator');
        expect(config.layout).toBe('admin');
        expect(config.widgets.length).toBeGreaterThan(0);
        expect(config.navigation.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should get dashboard config for commissioner', (done) => {
      service.getDashboardConfig(10).subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.roleId).toBe(10);
        expect(config.roleName).toBe('Commissioner');
        expect(config.layout).toBe('commissioner');
        expect(config.widgets.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should get dashboard config for licensee', (done) => {
      service.getDashboardConfig(8).subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.roleId).toBe(8);
        expect(config.roleName).toBe('Supply Chain');
        expect(config.layout).toBe('licensee');
        expect(config.widgets.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should throw error for invalid role ID', () => {
      expect(() => {
        service.getDashboardConfig(999).subscribe();
      }).toThrow();
    });
  });

  describe('Current User Dashboard Config', () => {
    it('should get current user dashboard config', (done) => {
      const mockUser: User = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleId: 2,
        role: {
          id: 2,
          name: 'site_admin',
          displayName: 'Site Administrator',
          permissions: ['dashboard.view'],
          hierarchy: 1
        },
        permissions: ['dashboard.view'],
        isActive: true
      };

      roleService.getCurrentUser.and.returnValue(mockUser);

      service.getCurrentUserDashboardConfig().subscribe(config => {
        expect(config).toBeTruthy();
        expect(config.roleId).toBe(2);
        done();
      });
    });

    it('should throw error when no current user', () => {
      roleService.getCurrentUser.and.returnValue(null);

      expect(() => {
        service.getCurrentUserDashboardConfig().subscribe();
      }).toThrow();
    });
  });

  describe('Helper Methods', () => {
    it('should get widgets by role', () => {
      const widgets = service.getWidgetsByRole(2);
      expect(widgets.length).toBeGreaterThan(0);
      expect(widgets[0].id).toBeTruthy();
      expect(widgets[0].type).toBeTruthy();
    });

    it('should get navigation by role', () => {
      const navigation = service.getNavigationByRole(2);
      expect(navigation.length).toBeGreaterThan(0);
      expect(navigation[0].label).toBeTruthy();
      expect(navigation[0].route).toBeTruthy();
    });

    it('should get layout by role', () => {
      expect(service.getLayoutByRole(2)).toBe('admin');
      expect(service.getLayoutByRole(10)).toBe('commissioner');
      expect(service.getLayoutByRole(8)).toBe('licensee');
      expect(service.getLayoutByRole(999)).toBe('admin'); // default
    });
  });

  describe('Widget Configuration Validation', () => {
    it('should have valid widget configurations for all roles', () => {
      const roleIds = [2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      
      roleIds.forEach(roleId => {
        service.getDashboardConfig(roleId).subscribe(config => {
          expect(config.widgets).toBeTruthy();
          
          config.widgets.forEach(widget => {
            expect(widget.id).toBeTruthy();
            expect(widget.type).toBeTruthy();
            expect(widget.title).toBeTruthy();
            expect(widget.position).toBeTruthy();
            expect(widget.size).toBeTruthy();
            expect(widget.permissions).toBeTruthy();
            expect(widget.data).toBeTruthy();
          });
        });
      });
    });

    it('should have valid navigation configurations for all roles', () => {
      const roleIds = [2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      
      roleIds.forEach(roleId => {
        service.getDashboardConfig(roleId).subscribe(config => {
          expect(config.navigation).toBeTruthy();
          
          config.navigation.forEach(navItem => {
            expect(navItem.label).toBeTruthy();
            expect(navItem.route).toBeTruthy();
            expect(navItem.icon).toBeTruthy();
          });
        });
      });
    });
  });
});