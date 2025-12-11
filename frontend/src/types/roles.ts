/**
 * User roles matching the PRD Personas & Roles section
 */
export type UserRole = 'provider' | 'biller' | 'practice_admin' | 'platform_admin';

// All possible roles
export type AnyUserRole = UserRole;

/**
 * Check if user has admin privileges (practice admin or platform admin)
 */
export function isAdmin(role: AnyUserRole | undefined): boolean {
  return role === 'practice_admin' || role === 'platform_admin';
}

/**
 * Check if user can finalize encounters (biller or admin)
 */
export function canFinalize(role: AnyUserRole | undefined): boolean {
  return role === 'biller' || isAdmin(role);
}

/**
 * Check if user can access analytics
 */
export function canAccessAnalytics(role: AnyUserRole | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user can access admin section
 */
export function canAccessAdmin(role: AnyUserRole | undefined): boolean {
  return isAdmin(role);
}

/**
 * Check if user is a platform admin
 */
export function isPlatformAdmin(role: AnyUserRole | undefined): boolean {
  return role === 'platform_admin';
}

/**
 * Get human-readable label for a role
 */
export function getRoleLabel(role: AnyUserRole | undefined): string {
  switch (role) {
    case 'provider':
      return 'Provider';
    case 'biller':
      return 'Biller';
    case 'practice_admin':
      return 'Practice Admin';
    case 'platform_admin':
      return 'Platform Admin';
    default:
      return 'User';
  }
}

/**
 * Normalize role - handles any legacy role values from backend
 */
export function normalizeRole(role: string): UserRole {
  // Handle legacy 'admin' role from database
  if (role === 'admin') {
    return 'practice_admin';
  }
  return role as UserRole;
}

