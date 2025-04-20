// Define all available permissions
export const Permissions = {
  // Shift Management
  VIEW_SHIFTS: 'view_shifts',
  CREATE_SHIFTS: 'create_shifts',
  EDIT_SHIFTS: 'edit_shifts',
  DELETE_SHIFTS: 'delete_shifts',
  VIEW_OWN_SHIFTS: 'view_own_shifts',
  
  // Employee Management
  VIEW_EMPLOYEES: 'view_employees',
  CREATE_EMPLOYEES: 'create_employees',
  EDIT_EMPLOYEES: 'edit_employees',
  DELETE_EMPLOYEES: 'delete_employees',
  VIEW_OWN_PROFILE: 'view_own_profile',
  EDIT_OWN_PROFILE: 'edit_own_profile',
  
  // Payroll
  VIEW_PAYROLL: 'view_payroll',
  EXPORT_PAYROLL: 'export_payroll',
  VIEW_OWN_PAYROLL: 'view_own_payroll',
  
  // Invoicing
  MANAGE_INVOICES: 'manage_invoices',
  SEND_INVOICES: 'send_invoices',
  
  // System Management
  MANAGE_TEMPLATES: 'manage_templates',
  MANAGE_RATES: 'manage_rates',
  MANAGE_LOCATIONS: 'manage_locations',
  MANAGE_CLIENTS: 'manage_clients',
  SEND_EMAILS: 'send_emails',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // Dashboard & Reports
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_REPORTS: 'view_reports',
  
  // Shift Requests
  VIEW_SHIFT_REQUESTS: 'view_shift_requests',
  APPROVE_SHIFT_REQUESTS: 'approve_shift_requests',
  SUBMIT_SHIFT_REQUESTS: 'submit_shift_requests',
  VIEW_OWN_REQUESTS: 'view_own_requests',
  
  // Calendar & Agenda
  VIEW_CALENDAR: 'view_calendar',
  VIEW_OWN_CALENDAR: 'view_own_calendar',
  
  // Communication
  VIEW_ANNOUNCEMENTS: 'view_announcements',
  VIEW_MESSAGES: 'view_messages',
  VIEW_TIMELINE: 'view_timeline',
  
  // Other
  ASSIGN_EMPLOYEES: 'assign_employees',
  MANAGE_FAVORITES: 'manage_favorites',
} as const;

// Define role permissions
export const RolePermissions: Record<string, string[]> = {
  admin: [
    Permissions.VIEW_SHIFTS,
    Permissions.CREATE_SHIFTS,
    Permissions.EDIT_SHIFTS,
    Permissions.DELETE_SHIFTS,
    Permissions.VIEW_EMPLOYEES,
    Permissions.CREATE_EMPLOYEES,
    Permissions.EDIT_EMPLOYEES,
    Permissions.DELETE_EMPLOYEES,
    Permissions.VIEW_PAYROLL,
    Permissions.EXPORT_PAYROLL,
    Permissions.MANAGE_INVOICES,
    Permissions.SEND_INVOICES,
    Permissions.MANAGE_TEMPLATES,
    Permissions.MANAGE_RATES,
    Permissions.MANAGE_LOCATIONS,
    Permissions.MANAGE_CLIENTS,
    Permissions.SEND_EMAILS,
    Permissions.MANAGE_USERS,
    Permissions.MANAGE_ROLES,
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_REPORTS,
    Permissions.VIEW_SHIFT_REQUESTS,
    Permissions.APPROVE_SHIFT_REQUESTS,
    Permissions.ASSIGN_EMPLOYEES,
    Permissions.MANAGE_FAVORITES,
    Permissions.VIEW_CALENDAR,
    Permissions.VIEW_ANNOUNCEMENTS,
    Permissions.VIEW_MESSAGES,
    Permissions.VIEW_TIMELINE,
  ],
  planner: [
    Permissions.VIEW_SHIFTS,
    Permissions.CREATE_SHIFTS,
    Permissions.EDIT_SHIFTS,
    Permissions.DELETE_SHIFTS,
    Permissions.VIEW_EMPLOYEES,
    Permissions.VIEW_SHIFT_REQUESTS,
    Permissions.APPROVE_SHIFT_REQUESTS,
    Permissions.VIEW_DASHBOARD,
    Permissions.ASSIGN_EMPLOYEES,
    Permissions.MANAGE_FAVORITES,
    Permissions.VIEW_CALENDAR,
    Permissions.VIEW_ANNOUNCEMENTS,
    Permissions.VIEW_MESSAGES,
    Permissions.VIEW_TIMELINE,
  ],
  employee: [
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_OWN_SHIFTS,
    Permissions.SUBMIT_SHIFT_REQUESTS,
    Permissions.VIEW_OWN_REQUESTS,
    Permissions.VIEW_OWN_PROFILE,
    Permissions.EDIT_OWN_PROFILE,
    Permissions.VIEW_OWN_CALENDAR,
    Permissions.VIEW_ANNOUNCEMENTS,
    Permissions.VIEW_MESSAGES,
    Permissions.VIEW_TIMELINE,
    Permissions.VIEW_OWN_PAYROLL,
  ],
};

// Helper function to get permissions for a role
export function getPermissionsForRole(role: string): string[] {
  return RolePermissions[role] || [];
}

// Helper function to get all permissions for multiple roles
export function getAllPermissions(roles: string[]): string[] {
  const permissions = new Set<string>();
  roles.forEach(role => {
    getPermissionsForRole(role).forEach(permission => {
      permissions.add(permission);
    });
  });
  return Array.from(permissions);
}

// Helper function to check if a user has a specific permission
export function hasPermission(userRoles: string[], requiredPermission: string): boolean {
  const permissions = getAllPermissions(userRoles);
  return permissions.includes(requiredPermission);
}

// Helper function to check if a user has any of the required permissions
export function hasAnyPermission(userRoles: string[], requiredPermissions: string[]): boolean {
  const permissions = getAllPermissions(userRoles);
  return requiredPermissions.some(permission => permissions.includes(permission));
}

// Helper function to check if a user has all of the required permissions
export function hasAllPermissions(userRoles: string[], requiredPermissions: string[]): boolean {
  const permissions = getAllPermissions(userRoles);
  return requiredPermissions.every(permission => permissions.includes(permission));
}

export function hasRole(userRoles: string[], requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.some(role => userRoles.includes(role));
  }
  return userRoles.includes(requiredRole);
} 