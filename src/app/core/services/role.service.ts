import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Role, User } from '../models/role.models';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Role ID mappings based on your database
  private readonly ROLE_MAPPINGS = {
    1: { name: 'site_admin', displayName: 'Role ID: 1', hierarchy: 1 },
    2: { name: 'licensee', displayName: 'Role ID: 2', hierarchy: 11 },
    3: { name: 'single_window', displayName: 'Role ID: 3', hierarchy: 6 },
    4: { name: 'district_user', displayName: 'Role ID: 4', hierarchy: 7 },
    5: { name: 'permit_section', displayName: 'Role ID: 5', hierarchy: 8 },
    6: { name: 'it_cell', displayName: 'Role ID: 6', hierarchy: 9 },
    7: { name: 'officer_in_charge', displayName: 'Role ID: 7', hierarchy: 10 },
    8: { name: 'sub_enquiry_officer', displayName: 'Role ID: 8', hierarchy: 5 },
    9: { name: 'joint_commissioner', displayName: 'Role ID: 9', hierarchy: 4 },
    10: { name: 'commissioner', displayName: 'Role ID: 10', hierarchy: 3 },
    11: { name: 'secretary', displayName: 'Role ID: 11', hierarchy: 2 }
  };

  constructor() {
    this.restoreUserFromStorage();
  }

  private hasAuthTokens(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const access = localStorage.getItem('access');
      const refresh = localStorage.getItem('refresh');
      return !!access && !!refresh;
    } catch {
      return false;
    }
  }

  private restoreUserFromStorage(): void {
    try {
      if (!this.hasAuthTokens()) {
        try {
          sessionStorage.removeItem('currentUser');
        } catch (error) {
          console.warn('Failed to remove user from storage:', error);
        }
        this.currentUserSubject.next(null);
        return;
      }

      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const authUsername = String(localStorage.getItem('username') || '').trim();
        const storedUsername = String(user?.username || '').trim();
        if (authUsername && storedUsername && authUsername !== storedUsername) {
          sessionStorage.removeItem('currentUser');
          this.currentUserSubject.next(null);
          return;
        }
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.warn('Failed to restore user from storage:', error);
    }
  }

  private saveUserToStorage(user: User): void {
    try {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to save user to storage:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    this.saveUserToStorage(user);
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
    try {
      sessionStorage.removeItem('currentUser');
    } catch (error) {
      console.warn('Failed to clear user from storage:', error);
    }
  }

  getRoleById(roleId: number): Role | null {
    const roleMapping = this.ROLE_MAPPINGS[roleId as keyof typeof this.ROLE_MAPPINGS];
    if (!roleMapping) {
      const currentUser = this.getCurrentUser();
      const inferredPermissions =
        currentUser?.roleId === roleId && Array.isArray(currentUser.permissions)
          ? currentUser.permissions
          : [];

      return {
        id: roleId,
        name: `role_${roleId}`,
        displayName: `Role ${roleId}`,
        permissions: inferredPermissions,
        hierarchy: 999
      };
    }

    return {
      id: roleId,
      name: roleMapping.name,
      displayName: roleMapping.displayName,
      permissions: this.getPermissionsByRoleId(roleId),
      hierarchy: roleMapping.hierarchy
    };
  }

  hasRole(roleId: number): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.roleId === roleId;
  }

  hasAnyRole(roleIds: number[]): boolean {
    const currentUser = this.getCurrentUser();
    return roleIds.includes(currentUser?.roleId || 0);
  }

  hasPermission(permission: string): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.permissions.includes(permission) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    
    return permissions.some(permission => 
      currentUser.permissions.includes(permission)
    );
  }

  canAccessRole(targetRoleId: number): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const currentRole = this.getRoleById(currentUser.roleId);
    const targetRole = this.getRoleById(targetRoleId);

    if (!currentRole || !targetRole) return false;
    return currentRole.hierarchy <= targetRole.hierarchy;
  }

  isAdminRole(roleId?: number): boolean {
    const checkRoleId = roleId || this.getCurrentUser()?.roleId;
    if (!checkRoleId) return false;

    const adminRoles = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    return adminRoles.includes(checkRoleId);
  }

  isLicenseeRole(roleId?: number): boolean {
    const checkRoleId = roleId || this.getCurrentUser()?.roleId;
    if (!checkRoleId) return false;

    const licenseeRoles = [2];
    return licenseeRoles.includes(checkRoleId);
  }

  getRoleName(roleId: number): string {
    const role = this.getRoleById(roleId);
    return role?.displayName || 'Unknown Role';
  }

  private getPermissionsByRoleId(roleId: number): string[] {
    // Define permissions based on role
    const permissionMap: { [key: number]: string[] } = {
      // Site Admin - Full access
      1: [
        'dashboard.view', 'applications.view', 'applications.create', 'applications.update', 'applications.delete',
        'applications.approve', 'applications.reject', 'users.view', 'users.create', 'users.update', 'users.delete',
        'reports.view', 'reports.generate', 'system.view', 'system.configure', 'master.view', 'master.update'
      ],

      // Licensee
      2: [
        'dashboard.view', 'licensee.applications.view', 'licensee.applications.create',
        'licensee.profile.view', 'licensee.profile.update'
      ],
      
      // Commissioner - High level admin access
      10: [
        'dashboard.view', 'applications.view', 'applications.approve', 'applications.reject',
        'reports.view', 'reports.generate', 'master.view', 'hologram.manage', 'payment.manage'
      ],
      
      // IT Cell - System management
      6: [
        'dashboard.view', 'system.view', 'system.monitor', 'users.view', 'users.create', 'users.update',
        'logs.view', 'reports.view'
      ],
      
      // Single Window - Application management
      3: [
        'dashboard.view', 'applications.view', 'applications.create', 'applications.update',
        'applications.process', 'reports.view'
      ],
      
      // Permit Section - Permit management
      5: [
        'dashboard.view', 'permits.view', 'permits.create', 'permits.update', 'permits.approve',
        'requisition.view', 'requisition.process', 'revalidation.view', 'revalidation.process',
        'cancellation.view', 'cancellation.process', 'transit.view', 'transit.process'
      ],
      
      // Officer in Charge - Hologram management
      7: [
        'dashboard.view', 'hologram.view', 'hologram.request', 'hologram.approve',
        'applications.view', 'reports.view'
      ],

      // District User / Sub Enquiry Officer / Joint Commissioner / Secretary
      4: ['dashboard.view', 'applications.view', 'applications.process', 'reports.view'],
      8: ['dashboard.view', 'applications.view', 'applications.process', 'reports.view'],
      9: ['dashboard.view', 'applications.view', 'applications.approve', 'reports.view'],
      11: ['dashboard.view', 'applications.view', 'applications.approve', 'reports.view']
    };

    return permissionMap[roleId] || [];
  }

  // Legacy compatibility methods for existing code
  hasAnyRoleByName(roleNames: string[]): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const currentRoleName = this.ROLE_MAPPINGS[currentUser.roleId as keyof typeof this.ROLE_MAPPINGS]?.name;
    return roleNames.includes(currentRoleName || '');
  }

  // Get all available roles (for admin interfaces)
  getAllRoles(): Role[] {
    return Object.entries(this.ROLE_MAPPINGS).map(([id, mapping]) => ({
      id: parseInt(id),
      name: mapping.name,
      displayName: mapping.displayName,
      permissions: this.getPermissionsByRoleId(parseInt(id)),
      hierarchy: mapping.hierarchy
    }));
  }
}
