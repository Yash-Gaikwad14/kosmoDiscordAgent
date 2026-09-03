import { UserContext } from '../../types';

export const ALLOWED_MANAGEMENT_ROLES = [
  'founder',
  'team kosmo',
  'admin',
  'administrator',
  'moderator',
];

export interface IPolicyService {
  canExecuteNLManagement(user: UserContext): boolean;
  canExecuteAction(user: UserContext, actionType: string): boolean;
}

export class PolicyService implements IPolicyService {
  /**
   * Checks if a user has permission to invoke Natural Language Management (/kosmo manage).
   */
  public canExecuteNLManagement(user: UserContext): boolean {
    if (!user) return false;

    // Explicit founder override
    if (user.isFounder) {
      return true;
    }

    // Role check against authorized logical management roles
    const userRoles = (user.roles || []).map((r) => r.toLowerCase().trim());
    return userRoles.some((r) => ALLOWED_MANAGEMENT_ROLES.includes(r));
  }

  /**
   * Checks if a user is authorized to perform a specific action type.
   */
  public canExecuteAction(user: UserContext, actionType: string): boolean {
    if (!this.canExecuteNLManagement(user)) {
      return false;
    }

    // Destructive actions are not permitted through standard policy
    if (actionType === 'DELETE_CHANNEL' || actionType === 'DELETE_ROLE') {
      return false;
    }

    return true;
  }
}

export const policyService = new PolicyService();
