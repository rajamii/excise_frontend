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
    2: { name: 'site_admin', displayName: 'Site Administrator', hierarchy: 1 },
    8: { name: 'supply_chain', displayName: 'Supply Chain', hierarchy: 8 },
    9: { name: 'permit_section', displayName: 'Permit Section', hierarchy: 6 },
    10: { name: 'commissioner', displayName: 'Commissioner', hierarchy: 2 },
    11: { name: 'level_1', displayName: 'Level 1 Officer', hierarchy: 3 },
    12: { name: 'it_cell', displayName: 'IT Cell', hierarchy: 4 },
    13: { name: 'level_2', displayName: 'Level 2 Officer', hierarchy: 4 },
    14: { name: 'level_3', displayName: 'Level 3 Officer', hierarchy: 5 },
    15: { name: 'level_4', displayName: 'Level 4 Officer', hierarchy: 6 },
    16: { name: 'level_5', displayName: 'Level 5 Officer', hierarchy: 7 },
    17: { name: 'single_window', displayName: 'Single Window', hierarchy: 5 },
    18: { name: 'officer_in_charge', displayName: 'Officer in Charge', hierarchy: 6 },
    19: { name: 'licensee', displayName: 'Licensee', hierarchy: 9 }
  };

  constructor() {
    // Try to restore user from session storage first
    this.restoreUserFromStorage();
    
    // If no user found, initialize with mock user for development
    if (!this.getCurrentUser()) {
      this.initializeCurrentUser();
    }
  }

  private restoreUserFromStorage(): void {
    try {
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('✅ Restored user from session storage:', user);
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore user from storage:', error);
    }
  }

  private saveUserToStorage(user: User): void {
    try {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      console.log('✅ Saved user to session storage');
    } catch (error) {
      console.warn('⚠️ Failed to save user to storage:', error);
    }
  }

  private initializeCurrentUser(): void {
    // This would typically come from authentication service
    // For now, using mock data
    const mockUser: User = {
      id: 1,
      username: 'admin',
      email: 'admin@excise.gov',
      fullName: 'System Administrator',
      roleId: 2,
      role: this.getRoleById(2)!,
      permissions: this.getPermissionsByRoleId(2),
      isActive: true,
      lastLogin: new Date()
    };
    
    this.currentUserSubject.next(mockUser);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    // Save to session storage for persistence across page refreshes
    this.saveUserToStorage(user);
  }

  getRoleById(roleId: number): Role | null {
    const roleMapping = this.ROLE_MAPPINGS[roleId as keyof typeof this.ROLE_MAPPINGS];
    if (!roleMapping) return null;

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

    // Higher hierarchy (lower number) can access lower hierarchy (higher number)
    return currentRole.hierarchy <= targetRole.hierarchy;
  }

  isAdminRole(roleId?: number): boolean {
    const checkRoleId = roleId || this.getCurrentUser()?.roleId;
    if (!checkRoleId) return false;

    // Admin roles: site_admin, commissioner, level_1, level_2, level_3, level_4, level_5, single_window, it_cell, permit_section, officer_in_charge
    const adminRoles = [2, 10, 11, 12, 13, 14, 15, 16, 17, 9, 18];
    return adminRoles.includes(checkRoleId);
  }

  isLicenseeRole(roleId?: number): boolean {
    const checkRoleId = roleId || this.getCurrentUser()?.roleId;
    if (!checkRoleId) return false;

    // Licensee roles: supply_chain, licensee
    const licenseeRoles = [8, 19];
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
      2: [
        'dashboard.view', 'applications.view', 'applications.create', 'applications.update', 'applications.delete',
        'applications.approve', 'applications.reject', 'users.view', 'users.create', 'users.update', 'users.delete',
        'reports.view', 'reports.generate', 'system.view', 'system.configure', 'master.view', 'master.update'
      ],
      
      // Commissioner - High level admin access
      10: [
        'dashboard.view', 'applications.view', 'applications.approve', 'applications.reject',
        'reports.view', 'reports.generate', 'master.view', 'hologram.manage', 'payment.manage'
      ],
      
      // Level Officers - Application processing
      11: ['dashboard.view', 'applications.view', 'applications.process', 'applications.approve', 'reports.view'],
      13: ['dashboard.view', 'applications.view', 'applications.process', 'applications.approve', 'reports.view'],
      14: ['dashboard.view', 'applications.view', 'applications.process', 'reports.view'],
      15: ['dashboard.view', 'applications.view', 'applications.process', 'reports.view'],
      16: ['dashboard.view', 'applications.view', 'applications.process', 'reports.view'],
      
      // IT Cell - System management
      12: [
        'dashboard.view', 'system.view', 'system.monitor', 'users.view', 'users.create', 'users.update',
        'logs.view', 'reports.view'
      ],
      
      // Single Window - Application management
      17: [
        'dashboard.view', 'applications.view', 'applications.create', 'applications.update',
        'applications.process', 'reports.view'
      ],
      
      // Permit Section - Permit management
      9: [
        'dashboard.view', 'permits.view', 'permits.create', 'permits.update', 'permits.approve',
        'requisition.view', 'requisition.process', 'revalidation.view', 'revalidation.process',
        'cancellation.view', 'cancellation.process', 'transit.view', 'transit.process'
      ],
      
      // Officer in Charge - Hologram management
      18: [
        'dashboard.view', 'hologram.view', 'hologram.request', 'hologram.approve',
        'applications.view', 'reports.view'
      ],
      
      // Supply Chain - Licensee operations
      8: [
        'dashboard.view', 'licensee.applications.view', 'licensee.applications.create',
        'supply_chain.view', 'supply_chain.manage', 'requisition.create', 'revalidation.create',
        'transit.create', 'hologram.request', 'payments.view'
      ],
      
      // Licensee - Basic licensee operations
      19: [
        'dashboard.view', 'licensee.applications.view', 'licensee.applications.create',
        'licensee.profile.view', 'licensee.profile.update'
      ]
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