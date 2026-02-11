import { TestBed } from '@angular/core/testing';
import { RoleService } from './role.service';
import { User, Role } from '../models/role.models';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Role Management', () => {
    it('should get role by ID', () => {
      const role = service.getRoleById(2);
      expect(role).toBeTruthy();
      expect(role?.name).toBe('site_admin');
      expect(role?.displayName).toBe('Site Administrator');
    });

    it('should return null for invalid role ID', () => {
      const role = service.getRoleById(999);
      expect(role).toBeNull();
    });

    it('should check if user has specific role', () => {
      const mockUser: User = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleId: 2,
        role: service.getRoleById(2)!,
        permissions: ['dashboard.view'],
        isActive: true
      };

      service.setCurrentUser(mockUser);
      
      expect(service.hasRole(2)).toBeTruthy();
      expect(service.hasRole(8)).toBeFalsy();
    });

    it('should check if user has any of multiple roles', () => {
      const mockUser: User = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleId: 2,
        role: service.getRoleById(2)!,
        permissions: ['dashboard.view'],
        isActive: true
      };

      service.setCurrentUser(mockUser);
      
      expect(service.hasAnyRole([2, 8, 9])).toBeTruthy();
      expect(service.hasAnyRole([8, 9, 10])).toBeFalsy();
    });
  });

  describe('Permission Management', () => {
    beforeEach(() => {
      const mockUser: User = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleId: 2,
        role: service.getRoleById(2)!,
        permissions: ['dashboard.view', 'applications.view', 'users.create'],
        isActive: true
      };

      service.setCurrentUser(mockUser);
    });

    it('should check if user has specific permission', () => {
      expect(service.hasPermission('dashboard.view')).toBeTruthy();
      expect(service.hasPermission('invalid.permission')).toBeFalsy();
    });

    it('should check if user has any of multiple permissions', () => {
      expect(service.hasAnyPermission(['dashboard.view', 'invalid.permission'])).toBeTruthy();
      expect(service.hasAnyPermission(['invalid.permission1', 'invalid.permission2'])).toBeFalsy();
    });
  });

  describe('Role Hierarchy', () => {
    it('should identify admin roles correctly', () => {
      expect(service.isAdminRole(2)).toBeTruthy(); // site_admin
      expect(service.isAdminRole(10)).toBeTruthy(); // commissioner
      expect(service.isAdminRole(8)).toBeFalsy(); // supply_chain
      expect(service.isAdminRole(19)).toBeFalsy(); // licensee
    });

    it('should identify licensee roles correctly', () => {
      expect(service.isLicenseeRole(8)).toBeTruthy(); // supply_chain
      expect(service.isLicenseeRole(19)).toBeTruthy(); // licensee
      expect(service.isLicenseeRole(2)).toBeFalsy(); // site_admin
      expect(service.isLicenseeRole(10)).toBeFalsy(); // commissioner
    });

    it('should check role access hierarchy', () => {
      const mockUser: User = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleId: 2, // site_admin with hierarchy 1
        role: service.getRoleById(2)!,
        permissions: ['dashboard.view'],
        isActive: true
      };

      service.setCurrentUser(mockUser);
      
      // Site admin (hierarchy 1) should access lower hierarchy roles
      expect(service.canAccessRole(8)).toBeTruthy(); // supply_chain (hierarchy 8)
      expect(service.canAccessRole(10)).toBeTruthy(); // commissioner (hierarchy 2)
    });
  });

  describe('Legacy Compatibility', () => {
    beforeEach(() => {
      const mockUser: User = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        fullName: 'Admin User',
        roleId: 2,
        role: service.getRoleById(2)!,
        permissions: ['dashboard.view'],
        isActive: true
      };

      service.setCurrentUser(mockUser);
    });

    it('should support legacy role name checking', () => {
      expect(service.hasAnyRoleByName(['site_admin'])).toBeTruthy();
      expect(service.hasAnyRoleByName(['licensee'])).toBeFalsy();
    });

    it('should get all available roles', () => {
      const roles = service.getAllRoles();
      expect(roles.length).toBeGreaterThan(0);
      expect(roles.find(r => r.id === 2)).toBeTruthy();
    });
  });
});