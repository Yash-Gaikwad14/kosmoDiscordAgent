import { 
  Client, 
  GatewayIntentBits, 
  Message, 
  TextBasedChannel, 
  PermissionsBitField,
  GuildMember,
  REST,
  Routes,
  SlashCommandBuilder,
  Interaction,
  ChatInputCommandInteraction
} from 'discord.js';
import dotenv from 'dotenv';
import { 
  IKosmoPlatform, 
  InfrastructureBuildReport, 
  AgentMessage, 
  AgentContext, 
  UserContext 
} from '../types';
import { kosmoAgent, processDailyClaim, isApprovedGuildRole, isRestrictedRole } from '../agent';

dotenv.config();

/**
 * Production-ready IKosmoPlatform implementation using Discord.js v14.
 */
export class KosmoPlatform implements IKosmoPlatform {
  private client: Client;
  private welcomedUsers: Set<string> = new Set();

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.client.on('ready', async () => {
      console.log(`[KosmoPlatform] Bot logged in as ${this.client.user?.tag}`);
      await this.registerSlashCommands();
    });

    this.client.on('interactionCreate', async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this.handleChatInputCommand(interaction);
    });

    this.client.on('messageCreate', async (message: Message) => {
      await this.handleIntroductionsIcebreaker(message);
      await this.handleMessageCreate(message);
    });
  }

  private async registerSlashCommands(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !clientId) {
      console.warn('[KosmoPlatform] DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID not set; skipping slash command registration.');
      return;
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily Sparks reward (500 Sparks, or 2,000 for High-Karma users)')
        .toJSON(),
    ];

    try {
      const rest = new REST({ version: '10' }).setToken(token);
      if (guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log(`[KosmoPlatform] Registered guild slash commands for ${guildId}`);
      } else {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('[KosmoPlatform] Registered global slash commands');
      }
    } catch (error) {
      console.error('[KosmoPlatform] Failed to register slash commands:', error);
    }
  }

  private async handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.commandName !== 'daily') {
      return;
    }

    try {
      const member = interaction.member instanceof GuildMember 
        ? interaction.member 
        : (interaction.guild && interaction.user ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null) : null);
      
      const roles = member ? Array.from(member.roles.cache.keys()) : [];
      const founderRoleId = process.env.FOUNDER_ROLE_ID;
      const isFounder = member 
        ? (founderRoleId ? member.roles.cache.has(founderRoleId) : false) || member.permissions.has(PermissionsBitField.Flags.Administrator)
        : false;

      const userContext: UserContext = {
        id: interaction.user.id,
        username: interaction.user.username,
        roles,
        isFounder,
      };

      const result = await processDailyClaim(userContext, interaction.guildId ?? undefined);
      await interaction.reply({
        content: result.message,
        ephemeral: !result.success,
      });
    } catch (error) {
      console.error('[KosmoPlatform] Error handling /daily command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An unexpected error occurred while processing your daily reward. Please try again shortly.',
          ephemeral: true,
        });
      }
    }
  }

  private async handleIntroductionsIcebreaker(message: Message): Promise<void> {
    // Ignore messages from bots
    if (message.author.bot) {
      return;
    }

    const introductionsChannelId = process.env.INTRODUCTIONS_CHANNEL_ID;
    if (!introductionsChannelId || message.channelId !== introductionsChannelId) {
      return;
    }

    const userId = message.author.id;
    if (this.welcomedUsers.has(userId)) {
      return;
    }

    // Mark user as welcomed for this bot session
    this.welcomedUsers.add(userId);

    try {
      const member = message.member;
      const roles = member ? Array.from(member.roles.cache.keys()) : [];
      const founderRoleId = process.env.FOUNDER_ROLE_ID;
      const isFounder = member 
        ? (founderRoleId ? member.roles.cache.has(founderRoleId) : false) || member.permissions.has(PermissionsBitField.Flags.Administrator)
        : false;

      const userContext: UserContext = {
        id: userId,
        username: message.author.username,
        roles,
        isFounder,
      };

      const channelName = 'name' in message.channel && typeof message.channel.name === 'string'
        ? message.channel.name
        : 'introductions';

      const response = await kosmoAgent.generateIcebreaker(userContext, channelName);
      if (response.text) {
        await message.reply(response.text);
      }
    } catch (error) {
      console.error('[KosmoPlatform] Error generating icebreaker:', error);
    }
  }

  private async handleMessageCreate(message: Message): Promise<void> {
    // Ignore messages from bots
    if (message.author.bot) {
      return;
    }

    // Trigger Lock: Ignore all messages except where client.user is explicitly mentioned
    if (!this.client.user || !message.mentions.has(this.client.user)) {
      return;
    }

    try {
      // Build UserContext
      const member = message.member;
      const roles = member ? Array.from(member.roles.cache.keys()) : [];
      const founderRoleId = process.env.FOUNDER_ROLE_ID;
      const isFounder = member 
        ? (founderRoleId ? member.roles.cache.has(founderRoleId) : false) || member.permissions.has(PermissionsBitField.Flags.Administrator)
        : false;

      const userContext: UserContext = {
        id: message.author.id,
        username: message.author.username,
        roles,
        isFounder,
      };

      // Check rate limit before processing message
      const rateLimitResult = kosmoAgent.checkRateLimit(userContext);
      if (!rateLimitResult.allowed) {
        if (rateLimitResult.rejectionMessage) {
          await message.reply(rateLimitResult.rejectionMessage);
        }
        return;
      }

      // Fetch channel history for context
      const history = await this.fetchChannelHistory(message.channelId, 15);

      // Extract channel name safely
      const channelName = 'name' in message.channel && typeof message.channel.name === 'string' 
        ? message.channel.name 
        : 'direct-or-thread';

      // Build AgentContext
      const agentContext: AgentContext = {
        user: userContext,
        channelId: message.channelId,
        channelName,
        guildId: message.guildId ?? undefined,
        currentMessage: message.content,
        history,
      };

      // Call agent processMessage
      const response = await kosmoAgent.processMessage(agentContext);

      // Execute dynamic actions (e.g. ASSIGN_ROLE)
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          if (action.type === 'ASSIGN_ROLE' && action.payload?.roleName) {
            const roleName = String(action.payload.roleName);
            const targetUserId = action.targetUserId || message.author.id;
            const guildId = message.guildId;

            // Strict security checks: Only approved guild roles, never restricted/admin roles
            if (isApprovedGuildRole(roleName) && !isRestrictedRole(roleName) && guildId) {
              const assigned = await this.assignRole(guildId, targetUserId, roleName);
              if (assigned) {
                console.log(`[KosmoPlatform] Dynamically assigned approved role '${roleName}' to user ${targetUserId}`);
              }
            } else {
              console.warn(`[KosmoPlatform] Rejected role assignment for non-approved or restricted role: '${roleName}'`);
            }
          }
        }
      }

      // Reply with the generated text
      if (response.text) {
        await message.reply(response.text);
      }
    } catch (error) {
      console.error('[KosmoPlatform] Error processing message:', error);
      try {
        await message.reply("I'm sorry, I encountered an issue while processing your request. Please try again shortly.");
      } catch (replyError) {
        console.error('[KosmoPlatform] Failed to send fallback apology reply:', replyError);
      }
    }
  }

  /**
   * Connects the client to Discord using DISCORD_BOT_TOKEN.
   */
  async start(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN is not defined in environment variables.');
    }
    await this.client.login(token);
  }

  /**
   * Cleanly destroys the Discord client connection.
   */
  async stop(): Promise<void> {
    await this.client.destroy();
    console.log('[KosmoPlatform] Discord client destroyed.');
  }

  /**
   * Fetches recent message history from a channel and maps to AgentMessage format.
   */
  async fetchChannelHistory(channelId: string, limit: number = 15): Promise<AgentMessage[]> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return [];
      }

      const textChannel = channel as TextBasedChannel;
      const messages = await textChannel.messages.fetch({ limit });

      return Array.from(messages.values())
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map((msg: Message): AgentMessage => ({
          id: msg.id,
          authorId: msg.author.id,
          authorUsername: msg.author.username,
          isBot: msg.author.bot,
          content: msg.content,
          createdAt: msg.createdAt,
        }));
    } catch (error) {
      console.error(`[KosmoPlatform] Error fetching channel history for ${channelId}:`, error);
      return [];
    }
  }

  /**
   * Assigns a role to a guild member by role name.
   */
  async assignRole(guildId: string, userId: string, roleName: string): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        console.error(`[KosmoPlatform] Guild not found: ${guildId}`);
        return false;
      }

      const member: GuildMember = await guild.members.fetch(userId);
      if (!member) {
        console.error(`[KosmoPlatform] Member not found: ${userId} in guild ${guildId}`);
        return false;
      }

      const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase()) 
        || (await guild.roles.fetch()).find(r => r.name.toLowerCase() === roleName.toLowerCase());

      if (!role) {
        console.error(`[KosmoPlatform] Role not found: ${roleName} in guild ${guildId}`);
        return false;
      }

      await member.roles.add(role);
      return true;
    } catch (error) {
      console.error(`[KosmoPlatform] Error assigning role ${roleName} to ${userId}:`, error);
      return false;
    }
  }

  /**
   * Out of scope stub as required.
   */
  async buildInfrastructure(guildId: string): Promise<InfrastructureBuildReport> {
    return {
      success: false,
      rolesCreated: [],
      categoriesCreated: [],
      channelsCreated: [],
      errors: ['buildInfrastructure is out of scope for this build — server is set up manually'],
    };
  }
}

export const platform = new KosmoPlatform();
export const platformStub = platform;
