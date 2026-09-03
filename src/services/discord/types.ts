/**
 * Shared Discord Action and Plan type definitions for Kosmo Phase 3.
 */

export type DiscordActionType =
  | 'CREATE_CATEGORY'
  | 'CREATE_CHANNEL'
  | 'CREATE_ROLE'
  | 'ASSIGN_ROLE'
  | 'REMOVE_ROLE'
  | 'APPLY_PERMISSION_TEMPLATE'
  | 'UPDATE_CHANNEL_PERMISSIONS'
  | 'MODIFY_ROLE_PERMISSIONS'
  | 'DELETE_CHANNEL'
  | 'DELETE_ROLE';

export interface BaseDiscordAction {
  type: DiscordActionType;
  description?: string;
}

export interface CreateCategoryAction extends BaseDiscordAction {
  type: 'CREATE_CATEGORY';
  payload: {
    name: string;
    position?: number;
    permissionOverwrites?: Array<{
      targetId: string;
      targetType: 'role' | 'member';
      allow: string[];
      deny: string[];
    }>;
  };
}

export interface CreateChannelAction extends BaseDiscordAction {
  type: 'CREATE_CHANNEL';
  payload: {
    name: string;
    type: 'text' | 'voice' | 'announcement' | 'forum';
    categoryName?: string;
    topic?: string;
    permissionOverwrites?: Array<{
      targetId: string;
      targetType: 'role' | 'member';
      allow: string[];
      deny: string[];
    }>;
  };
}

export interface CreateRoleAction extends BaseDiscordAction {
  type: 'CREATE_ROLE';
  payload: {
    name: string;
    color?: string;
    hoist?: boolean;
    mentionable?: boolean;
    permissions?: string[];
  };
}

export interface AssignRoleAction extends BaseDiscordAction {
  type: 'ASSIGN_ROLE';
  payload: {
    userId: string;
    roleName: string;
  };
}

export interface RemoveRoleAction extends BaseDiscordAction {
  type: 'REMOVE_ROLE';
  payload: {
    userId: string;
    roleName: string;
  };
}

export interface ApplyPermissionTemplateAction extends BaseDiscordAction {
  type: 'APPLY_PERMISSION_TEMPLATE';
  payload: {
    channelName: string;
    template: 'read_only' | 'moderator_only' | 'public_chat' | 'announcements' | 'private_staff';
    roleName?: string;
  };
}

export interface UpdateChannelPermissionsAction extends BaseDiscordAction {
  type: 'UPDATE_CHANNEL_PERMISSIONS';
  payload: {
    channelName: string;
    roleName: string;
    allow: string[];
    deny: string[];
  };
}

export interface ModifyRolePermissionsAction extends BaseDiscordAction {
  type: 'MODIFY_ROLE_PERMISSIONS';
  payload: {
    roleName: string;
    permissions: string[];
  };
}

export interface DeleteChannelAction extends BaseDiscordAction {
  type: 'DELETE_CHANNEL';
  payload: {
    channelName: string;
  };
}

export interface DeleteRoleAction extends BaseDiscordAction {
  type: 'DELETE_ROLE';
  payload: {
    roleName: string;
  };
}

export type DiscordAction =
  | CreateCategoryAction
  | CreateChannelAction
  | CreateRoleAction
  | AssignRoleAction
  | RemoveRoleAction
  | ApplyPermissionTemplateAction
  | UpdateChannelPermissionsAction
  | ModifyRolePermissionsAction
  | DeleteChannelAction
  | DeleteRoleAction;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'BLOCKED';

export type PlanStatus = 'PROPOSED' | 'CONFIRMED' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';

export interface Plan {
  id: string;
  name: string;
  description: string;
  actions: DiscordAction[];
  riskLevel: RiskLevel;
  blockedReasons?: string[];
  status: PlanStatus;
  createdAt: Date;
  createdBy?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  blocked?: boolean;
  blockedReasons?: string[];
}

export interface NLContext {
  userId: string;
  username: string;
  roles: string[];
  guildId?: string;
  channelId?: string;
}

export interface NLPlanResult {
  success: boolean;
  plan?: Plan;
  explanation: string;
  validation: ValidationResult;
  rawLLMOutput?: string;
  error?: string;
}
