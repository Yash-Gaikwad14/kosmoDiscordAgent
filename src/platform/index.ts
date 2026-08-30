import { 
  IKosmoPlatform, 
  InfrastructureBuildReport, 
  AgentMessage 
} from '../types';

/**
 * Stub implementation of IKosmoPlatform.
 * feature/platform will implement the Discord.js client, slash commands (/build_infrastructure),
 * message event listeners, and Discord API actions.
 */
export class KosmoPlatformStub implements IKosmoPlatform {
  async start(): Promise<void> {
    console.log('[KosmoPlatformStub] Discord bot client initialized (stub mode).');
  }

  async stop(): Promise<void> {
    console.log('[KosmoPlatformStub] Discord bot client stopped (stub mode).');
  }

  async buildInfrastructure(guildId: string): Promise<InfrastructureBuildReport> {
    console.log(`[KosmoPlatformStub] Building infrastructure for guild ${guildId}...`);
    return {
      success: true,
      rolesCreated: [],
      categoriesCreated: [],
      channelsCreated: [],
      errors: []
    };
  }

  async assignRole(guildId: string, userId: string, roleName: string): Promise<boolean> {
    console.log(`[KosmoPlatformStub] Assigning role '${roleName}' to user ${userId} in guild ${guildId}.`);
    return true;
  }

  async fetchChannelHistory(channelId: string, limit: number = 15): Promise<AgentMessage[]> {
    console.log(`[KosmoPlatformStub] Fetching last ${limit} messages from channel ${channelId}.`);
    return [];
  }
}

export const platformStub = new KosmoPlatformStub();
