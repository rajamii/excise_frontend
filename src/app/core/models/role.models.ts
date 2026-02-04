export interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  hierarchy: number; // Lower number = higher authority
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleId: number;
  role: Role;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string; // 'view', 'create', 'update', 'delete', 'approve', etc.
}

export interface RoleHierarchy {
  roleId: number;
  parentRoleId?: number;
  level: number;
  canAccessChildRoles: boolean;
}