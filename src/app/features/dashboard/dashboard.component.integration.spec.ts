import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { DashboardContainerModule } from '../../shared/components/dashboard/dashboard-container/dashboard-container.module';
import { RoleService } from '../../core/services/role.service';
import { DashboardConfigService } from '../../core/services/dashboard-config.service';
import { User, Role } from '../../core/models/role.models';
import { DashboardConfig } from '../../core/models/dashboard.models';

describe('DashboardComponent Integration', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let roleService: jasmine.SpyObj<RoleService>;
  let dashboardConfigService: jasmine.SpyObj<DashboardConfigService>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    roleId: 2,
    role: {
      id: 2,
      name: 'site_admin',
      displayName: 'Site Administrator',
      permissions: ['dashboard.view', 'applications.view'],
      hierarchy: 1
    },
    permissions: ['dashboard.view', 'applications.view'],
    isActive: true
  };

  const mockDashboardConfig: DashboardConfig = {
    roleId: 2,
    roleName: 'Site Administrator',
    layout: 'admin',
    permissions: ['dashboard.view'],
    widgets: [
      {
        id: 'test-widget',
        type: 'stats-overview',
        title: 'Test Widget',
        position: { row: 1, col: 1 },
        size: { width: 'medium', height: 'medium' },
        permissions: ['dashboard.view'],
        data: { endpoint: '/api/test' }
      }
    ],
    navigation: [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'dashboard'
      }
    ]
  };

  beforeEach(async () => {
    const roleServiceSpy = jasmine.createSpyObj('RoleService', [
      'getCurrentUser',
      'setCurrentUser',
      'hasAnyPermission'
    ]);
    const dashboardConfigServiceSpy = jasmine.createSpyObj('DashboardConfigService', [
      'getCurrentUserDashboardConfig'
    ]);

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        BrowserAnimationsModule,
        DashboardContainerModule
      ],
      providers: [
        { provide: RoleService, useValue: roleServiceSpy },
        { provide: DashboardConfigService, useValue: dashboardConfigServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    roleService = TestBed.inject(RoleService) as jasmine.SpyObj<RoleService>;
    dashboardConfigService = TestBed.inject(DashboardConfigService) as jasmine.SpyObj<DashboardConfigService>;
  });

  describe('Successful Dashboard Load', () => {
    beforeEach(() => {
      roleService.getCurrentUser.and.returnValue(mockUser);
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(of(mockDashboardConfig));
    });

    it('should create and initialize successfully', () => {
      expect(component).toBeTruthy();
      
      fixture.detectChanges();
      
      expect(component.currentUser).toEqual(mockUser);
      expect(component.dashboardConfig).toEqual(mockDashboardConfig);
      expect(component.isLoading).toBeFalse();
      expect(component.error).toBeNull();
    });

    it('should display dashboard container when loaded', () => {
      fixture.detectChanges();
      
      const dashboardContainer = fixture.debugElement.query(
        sel => sel.name === 'app-dashboard-container'
      );
      
      expect(dashboardContainer).toBeTruthy();
    });

    it('should not show loading or error states when successful', () => {
      fixture.detectChanges();
      
      const loadingElement = fixture.debugElement.query(
        sel => sel.classes && sel.classes['dashboard-loading']
      );
      const errorElement = fixture.debugElement.query(
        sel => sel.classes && sel.classes['dashboard-error']
      );
      
      expect(loadingElement).toBeFalsy();
      expect(errorElement).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      roleService.getCurrentUser.and.returnValue(mockUser);
    });

    it('should handle dashboard config loading error', () => {
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(
        throwError('Config loading failed')
      );
      
      fixture.detectChanges();
      
      expect(component.error).toBeTruthy();
      expect(component.isLoading).toBeFalse();
    });

    it('should display error message when config fails to load', () => {
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(
        throwError('Config loading failed')
      );
      
      fixture.detectChanges();
      
      const errorElement = fixture.debugElement.query(
        sel => sel.classes && sel.classes['dashboard-error']
      );
      
      expect(errorElement).toBeTruthy();
    });

    it('should handle missing user error', () => {
      roleService.getCurrentUser.and.returnValue(null);
      
      fixture.detectChanges();
      
      expect(component.error).toBeTruthy();
      expect(component.error).toContain('No user found');
    });
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      roleService.getCurrentUser.and.returnValue(mockUser);
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(
        of(mockDashboardConfig).pipe(
          // Simulate delay
          delay => new Promise(resolve => setTimeout(() => resolve(delay), 100))
        )
      );
      
      expect(component.isLoading).toBeTrue();
    });

    it('should display loading spinner when loading', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      const loadingElement = fixture.debugElement.query(
        sel => sel.classes && sel.classes['dashboard-loading']
      );
      
      expect(loadingElement).toBeTruthy();
    });
  });

  describe('Dashboard Refresh', () => {
    beforeEach(() => {
      roleService.getCurrentUser.and.returnValue(mockUser);
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(of(mockDashboardConfig));
      fixture.detectChanges();
    });

    it('should refresh dashboard when requested', () => {
      component.error = 'Some error';
      
      component.onDashboardRefresh();
      
      expect(component.isLoading).toBeTrue();
      expect(component.error).toBeNull();
      expect(dashboardConfigService.getCurrentUserDashboardConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Permission Checking', () => {
    beforeEach(() => {
      roleService.getCurrentUser.and.returnValue(mockUser);
      roleService.hasAnyPermission.and.returnValue(true);
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(of(mockDashboardConfig));
      fixture.detectChanges();
    });

    it('should check permissions correctly', () => {
      const hasPermission = component.hasPermission(['dashboard.view']);
      
      expect(hasPermission).toBeTrue();
      expect(roleService.hasAnyPermission).toHaveBeenCalledWith(['dashboard.view']);
    });
  });

  describe('Legacy User Detection', () => {
    it('should handle legacy user detection when no current user', () => {
      roleService.getCurrentUser.and.returnValue(null);
      
      // Mock the legacy account service behavior
      spyOn(component as any, 'detectUserFromLegacySystem').and.callThrough();
      
      fixture.detectChanges();
      
      expect((component as any).detectUserFromLegacySystem).toHaveBeenCalled();
    });
  });

  describe('Role Mapping', () => {
    it('should map legacy roles to role IDs correctly', () => {
      const mockLegacyUser = {
        id: 1,
        username: 'admin',
        authorities: [{ name: 'site_admin' }]
      };
      
      const roleId = (component as any).mapLegacyRoleToRoleId(mockLegacyUser);
      
      expect(roleId).toBe(2); // site_admin maps to role ID 2
    });

    it('should default to site_admin for unknown roles', () => {
      const mockLegacyUser = {
        id: 1,
        username: 'user',
        authorities: [{ name: 'unknown_role' }]
      };
      
      const roleId = (component as any).mapLegacyRoleToRoleId(mockLegacyUser);
      
      expect(roleId).toBe(2); // defaults to site_admin
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      roleService.getCurrentUser.and.returnValue(mockUser);
      dashboardConfigService.getCurrentUserDashboardConfig.and.returnValue(of(mockDashboardConfig));
      
      fixture.detectChanges();
      
      spyOn((component as any).destroy$, 'next');
      spyOn((component as any).destroy$, 'complete');
      
      component.ngOnDestroy();
      
      expect((component as any).destroy$.next).toHaveBeenCalled();
      expect((component as any).destroy$.complete).toHaveBeenCalled();
    });
  });
});