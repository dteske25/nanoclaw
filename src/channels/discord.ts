import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
  TextChannel,
  DMChannel,
} from 'discord.js';

import { ASSISTANT_NAME, TRIGGER_PATTERN } from '../config.js';
import { storeChatMetadata, updateChatName } from '../db.js';
import { logger } from '../logger.js';
import { Channel, OnInboundMessage, OnChatMetadata, RegisteredGroup } from '../types.js';

const DISCORD_MAX_LENGTH = 2000;

export interface DiscordChannelOpts {
  token: string;
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
}

export class DiscordChannel implements Channel {
  name = 'discord';
  prefixAssistantName = false;

  private client: Client;
  private token: string;
  private connected = false;
  private opts: DiscordChannelOpts;

  // Track which channel to respond in per guild
  private guildResponseChannel = new Map<string, string>();

  constructor(opts: DiscordChannelOpts) {
    this.opts = opts;
    this.token = opts.token;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.once(Events.ClientReady, (readyClient) => {
        this.connected = true;
        logger.info(
          { username: readyClient.user.tag, id: readyClient.user.id },
          'Discord bot connected',
        );

        // Populate guild metadata
        for (const guild of readyClient.guilds.cache.values()) {
          const jid = `guild:${guild.id}`;
          storeChatMetadata(jid, new Date().toISOString());
          updateChatName(jid, guild.name);
        }

        resolve();
      });

      this.client.on(Events.MessageCreate, (message) => {
        this.handleMessage(message).catch((err) => {
          logger.error({ err }, 'Error handling Discord message');
        });
      });

      this.client.login(this.token).catch(reject);
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore own messages
    if (message.author.id === this.client.user?.id) return;
    // Ignore other bots
    if (message.author.bot) return;

    const isDM = !message.guild;
    const chatJid = isDM
      ? `dm:${message.author.id}`
      : `guild:${message.guild!.id}`;

    const timestamp = message.createdAt.toISOString();

    // Track the channel for guild responses
    if (!isDM) {
      this.guildResponseChannel.set(message.guild!.id, message.channel.id);
    }

    // Store chat metadata for discovery
    if (!isDM && message.guild) {
      this.opts.onChatMetadata(chatJid, timestamp, message.guild.name);
    } else {
      this.opts.onChatMetadata(chatJid, timestamp, message.author.username);
    }

    // Only deliver full message for registered groups
    const groups = this.opts.registeredGroups();
    if (!groups[chatJid]) {
      logger.debug({ chatJid }, 'Message from unregistered Discord chat');
      return;
    }

    // Build content: translate @mention to @nano prefix
    let content = message.content;
    const isMentioned = message.mentions.has(this.client.user!);

    if (isMentioned) {
      // Strip the <@BOT_ID> mention from content
      content = content.replace(new RegExp(`<@!?${this.client.user!.id}>`, 'g'), '').trim();
      // Prepend trigger if not already present
      if (!TRIGGER_PATTERN.test(content)) {
        content = `@${ASSISTANT_NAME} ${content}`;
      }
    }

    // For DMs, always prepend trigger so messages are always processed
    if (isDM && !TRIGGER_PATTERN.test(content)) {
      content = `@${ASSISTANT_NAME} ${content}`;
    }

    const senderName = message.member?.displayName || message.author.displayName || message.author.username;

    this.opts.onMessage(chatJid, {
      id: message.id,
      chat_jid: chatJid,
      sender: message.author.id,
      sender_name: senderName,
      content,
      timestamp,
      is_from_me: false,
    });

    logger.info(
      { chatJid, sender: senderName, isDM, isMentioned },
      'Discord message stored',
    );
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.connected) {
      logger.warn({ jid }, 'Discord not connected, cannot send message');
      return;
    }

    try {
      const channel = await this.resolveChannel(jid);
      if (!channel) {
        logger.warn({ jid }, 'Could not resolve Discord channel for JID');
        return;
      }

      // Split long messages (Discord 2000-char limit)
      const chunks = splitMessage(text);
      for (const chunk of chunks) {
        await channel.send(chunk);
      }

      logger.info({ jid, length: text.length }, 'Discord message sent');
    } catch (err) {
      logger.error({ jid, err }, 'Failed to send Discord message');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith('guild:') || jid.startsWith('dm:');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.client.destroy();
  }

  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!isTyping) return; // Discord typing auto-expires, no stop needed
    try {
      const channel = await this.resolveChannel(jid);
      if (channel) {
        await channel.sendTyping();
      }
    } catch (err) {
      logger.debug({ jid, err }, 'Failed to send Discord typing indicator');
    }
  }

  /**
   * Sync guild metadata from Discord.
   * Iterates cached guilds and stores their names in the database.
   */
  async syncGuildMetadata(): Promise<void> {
    if (!this.connected) return;

    let count = 0;
    for (const guild of this.client.guilds.cache.values()) {
      const jid = `guild:${guild.id}`;
      updateChatName(jid, guild.name);
      count++;
    }

    logger.info({ count }, 'Guild metadata synced');
  }

  private async resolveChannel(jid: string): Promise<TextChannel | DMChannel | null> {
    if (jid.startsWith('dm:')) {
      const userId = jid.slice(3);
      try {
        const user = await this.client.users.fetch(userId);
        return user.dmChannel || await user.createDM();
      } catch (err) {
        logger.error({ jid, err }, 'Failed to resolve DM channel');
        return null;
      }
    }

    if (jid.startsWith('guild:')) {
      const guildId = jid.slice(6);
      const channelId = this.guildResponseChannel.get(guildId);
      if (channelId) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.isTextBased() && !channel.isDMBased()) {
            return channel as TextChannel;
          }
        } catch {
          // Channel might have been deleted, clear mapping
          this.guildResponseChannel.delete(guildId);
        }
      }

      // Fallback: try to find a default text channel in the guild
      try {
        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        const textChannel = channels.find(
          (c) => c !== null && c.isTextBased() && !c.isDMBased(),
        );
        if (textChannel) {
          return textChannel as TextChannel;
        }
      } catch (err) {
        logger.error({ jid, err }, 'Failed to resolve guild channel');
      }
    }

    return null;
  }
}

function splitMessage(text: string): string[] {
  if (text.length <= DISCORD_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= DISCORD_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline near the limit
    let splitIdx = remaining.lastIndexOf('\n', DISCORD_MAX_LENGTH);
    if (splitIdx <= 0 || splitIdx < DISCORD_MAX_LENGTH / 2) {
      // Fallback: split at space
      splitIdx = remaining.lastIndexOf(' ', DISCORD_MAX_LENGTH);
    }
    if (splitIdx <= 0) {
      // Hard split
      splitIdx = DISCORD_MAX_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}
