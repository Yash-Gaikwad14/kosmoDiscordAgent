import { NLManager, LLMCompletionFn } from '../../services/discord/nl_manager';
import { NLContext, DiscordAction } from '../../services/discord/types';
import { PolicyService } from '../../services/discord/policy';
import { PermissionValidator } from '../../services/discord/permissionValidator';

describe('Phase 3 Natural Language Management (NLManager)', () => {
  const authorizedContext: NLContext = {
    userId: 'user-founder-1',
    username: 'KosmoFounder',
    roles: ['Founder', 'Admin'],
    guildId: 'guild-123',
    channelId: 'channel-456',
  };

  const unauthorizedContext: NLContext = {
    userId: 'user-regular-2',
    username: 'RandomMember',
    roles: ['Member'],
    guildId: 'guild-123',
    channelId: 'channel-456',
  };

  // -------------------------------------------------------------------------
  // TEST 1 — Valid NL request
  // -------------------------------------------------------------------------
  test('TEST 1: Valid NL request converts into expected Plan and DiscordAction[]', async () => {
    const mockOutput = JSON.stringify({
      planName: 'Configure Moderator Permissions for Deleting Messages',
      explanation: 'Set up channel overwrite so only moderators can manage messages in announcements.',
      actions: [
        {
          type: 'UPDATE_CHANNEL_PERMISSIONS',
          description: 'Allow Moderator to manage messages and deny @everyone from sending in announcements',
          payload: {
            channelName: 'announcements',
            roleName: 'Moderator',
            allow: ['ManageMessages', 'SendMessages'],
            deny: [],
          },
        },
        {
          type: 'APPLY_PERMISSION_TEMPLATE',
          description: 'Apply read_only template to announcements',
          payload: {
            channelName: 'announcements',
            template: 'read_only',
          },
        },
      ],
    });

    const mockLLM: LLMCompletionFn = jest.fn().mockResolvedValue(mockOutput);
    const manager = new NLManager(mockLLM);

    const result = await manager.generatePlan(
      'Make sure only moderators can delete messages in announcements',
      authorizedContext
    );

    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan?.name).toBe('Configure Moderator Permissions for Deleting Messages');
    expect(result.plan?.actions).toHaveLength(2);
    expect(result.plan?.actions[0].type).toBe('UPDATE_CHANNEL_PERMISSIONS');
    expect(result.plan?.actions[1].type).toBe('APPLY_PERMISSION_TEMPLATE');
    expect(result.plan?.status).toBe('PROPOSED');
    expect(result.plan?.riskLevel).toBe('MEDIUM');
    expect(result.validation.valid).toBe(true);
    expect(result.validation.blocked).toBe(false);
  });

  // -------------------------------------------------------------------------
  // TEST 2 — Dangerous action (blocked)
  // -------------------------------------------------------------------------
  test('TEST 2: Dangerous action (destructive deletion / admin escalation) is blocked', async () => {
    // 2a: Destructive deletion
    const destructiveOutput = JSON.stringify({
      planName: 'Delete General Channel',
      explanation: 'Remove the general channel.',
      actions: [
        {
          type: 'DELETE_CHANNEL',
          description: 'Delete #general',
          payload: {
            channelName: 'general',
          },
        },
      ],
    });

    const mockLLM1: LLMCompletionFn = jest.fn().mockResolvedValue(destructiveOutput);
    const manager1 = new NLManager(mockLLM1);

    const result1 = await manager1.generatePlan('Delete the general channel', authorizedContext);

    expect(result1.success).toBe(false);
    expect(result1.plan?.riskLevel).toBe('BLOCKED');
    expect(result1.validation.blocked).toBe(true);
    expect(result1.validation.blockedReasons).toBeDefined();
    expect(result1.validation.blockedReasons?.some((r) => r.includes('Destructive action'))).toBe(true);

    // 2b: Admin escalation
    const adminEscalationOutput = JSON.stringify({
      planName: 'Grant Administrator to VIP Role',
      explanation: 'Give Administrator permission to VIP.',
      actions: [
        {
          type: 'CREATE_ROLE',
          description: 'Create super VIP with Admin permission',
          payload: {
            name: 'SuperVIP',
            permissions: ['Administrator', 'SendMessages'],
          },
        },
      ],
    });

    const mockLLM2: LLMCompletionFn = jest.fn().mockResolvedValue(adminEscalationOutput);
    const manager2 = new NLManager(mockLLM2);

    const result2 = await manager2.generatePlan('Create SuperVIP with Administrator rights', authorizedContext);

    expect(result2.success).toBe(false);
    expect(result2.plan?.riskLevel).toBe('BLOCKED');
    expect(result2.validation.blocked).toBe(true);
    expect(result2.validation.blockedReasons?.some((r) => r.includes('forbidden permission'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // TEST 3 — Invalid JSON
  // -------------------------------------------------------------------------
  test('TEST 3: Malformed or non-JSON output is safely handled without crash', async () => {
    const invalidOutputs = [
      'I am an AI assistant and I cannot output JSON right now.',
      '{"planName": "Broken Plan", actions: [}',
      'Random conversational text with no JSON structure',
      '',
    ];

    for (const raw of invalidOutputs) {
      const mockLLM: LLMCompletionFn = jest.fn().mockResolvedValue(raw);
      const manager = new NLManager(mockLLM);

      const result = await manager.generatePlan('Do something complex', authorizedContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.validation.valid).toBe(false);
    }
  });

  // -------------------------------------------------------------------------
  // TEST 4 — Permission / policy integration
  // -------------------------------------------------------------------------
  test('TEST 4: Unauthorized management requests are rejected before LLM call', async () => {
    const mockLLM: LLMCompletionFn = jest.fn();
    const manager = new NLManager(mockLLM);

    const result = await manager.generatePlan(
      'Create a new private channel for me',
      unauthorizedContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
    expect(result.validation.blocked).toBe(true);
    expect(mockLLM).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // TEST 5 — Safety constraints & PermissionValidator adherence
  // -------------------------------------------------------------------------
  test('TEST 5: Protected role tampering and permissionValidator checks are strictly enforced', async () => {
    // 5a: Attempting to create or modify a protected role name
    const protectedRoleOutput = JSON.stringify({
      planName: 'Create Admin Role',
      explanation: 'Create a backup Admin role.',
      actions: [
        {
          type: 'CREATE_ROLE',
          payload: {
            name: 'Admin',
            permissions: ['SendMessages'],
          },
        },
      ],
    });

    const mockLLM: LLMCompletionFn = jest.fn().mockResolvedValue(protectedRoleOutput);
    const manager = new NLManager(mockLLM);

    const result = await manager.generatePlan('Create another Admin role', authorizedContext);

    expect(result.success).toBe(false);
    expect(result.plan?.riskLevel).toBe('BLOCKED');
    expect(result.validation.blocked).toBe(true);
    expect(result.validation.blockedReasons?.some((r) => r.includes('privileged/protected role'))).toBe(true);

    // 5b: Direct unit check on PermissionValidator for overwrite containing ManageGuild / BanMembers
    const forbiddenOverwriteAction: DiscordAction = {
      type: 'CREATE_CHANNEL',
      payload: {
        name: 'staff-room',
        type: 'text',
        permissionOverwrites: [
          {
            targetId: 'role-123',
            targetType: 'role',
            allow: ['BanMembers', 'ViewChannel'],
            deny: [],
          },
        ],
      },
    };

    const valResult = PermissionValidator.validateAction(forbiddenOverwriteAction);
    expect(valResult.valid).toBe(false);
    expect(valResult.blocked).toBe(true);
    expect(valResult.blockedReasons?.[0]).toContain('forbidden permission');
  });
});
