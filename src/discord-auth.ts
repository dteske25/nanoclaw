/**
 * Discord Authentication Script
 *
 * Run this during setup to validate Discord bot token.
 * Connects to Discord, displays bot info, then exits.
 *
 * Usage: DISCORD_TOKEN=your_token npx tsx src/discord-auth.ts
 *
 * To get a Discord bot token:
 * 1. Go to https://discord.com/developers/applications
 * 2. Create a new application (or select existing)
 * 3. Go to "Bot" section and click "Reset Token" to get a token
 * 4. Enable "Message Content Intent" under Privileged Gateway Intents
 * 5. Use the OAuth2 URL Generator to invite the bot to your server with:
 *    - Scopes: bot
 *    - Permissions: Send Messages, Read Message History, View Channels
 */

import { Client, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = './store/discord_token';

async function authenticate(): Promise<void> {
  // Check for token in environment or file
  let token = process.env.DISCORD_TOKEN;

  if (!token && fs.existsSync(TOKEN_FILE)) {
    token = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
  }

  if (!token) {
    console.log('Discord Bot Setup\n');
    console.log('To set up your Discord bot:');
    console.log('');
    console.log('1. Go to https://discord.com/developers/applications');
    console.log('2. Create a new application (or select existing)');
    console.log('3. Go to "Bot" section and click "Reset Token"');
    console.log('4. Enable "Message Content Intent" under Privileged Gateway Intents');
    console.log('5. Save your token to store/discord_token or set DISCORD_TOKEN env var');
    console.log('6. Use OAuth2 URL Generator to invite bot to your server with:');
    console.log('   - Scopes: bot');
    console.log('   - Permissions: Send Messages, Read Message History, View Channels');
    console.log('');
    console.log('Then run this script again.');
    process.exit(1);
  }

  console.log('Validating Discord bot token...\n');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`✓ Successfully authenticated as ${readyClient.user.tag}`);
    console.log(`  Bot ID: ${readyClient.user.id}`);
    console.log(`  Servers: ${readyClient.guilds.cache.size}`);
    console.log('');

    if (readyClient.guilds.cache.size === 0) {
      console.log('⚠ Bot is not in any servers yet.');
      console.log('  Use the OAuth2 URL Generator to invite it to your server.');
    } else {
      console.log('Available servers:');
      readyClient.guilds.cache.forEach((guild) => {
        console.log(`  - ${guild.name} (${guild.id})`);
      });
    }

    console.log('');

    // Save token to file if it was provided via env
    if (process.env.DISCORD_TOKEN && !fs.existsSync(TOKEN_FILE)) {
      fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
      fs.writeFileSync(TOKEN_FILE, token!, { mode: 0o600 });
      console.log('✓ Token saved to store/discord_token');
    }

    console.log('You can now start the NanoClaw service.\n');
    client.destroy();
    process.exit(0);
  });

  client.on(Events.Error, (error) => {
    console.error('✗ Discord connection error:', error.message);
    process.exit(1);
  });

  try {
    await client.login(token);
  } catch (err) {
    console.error('✗ Failed to authenticate with Discord');
    console.error('  Check that your token is correct and the bot is set up properly.');
    if (err instanceof Error) {
      console.error(`  Error: ${err.message}`);
    }
    process.exit(1);
  }
}

authenticate().catch((err) => {
  console.error('Authentication failed:', err.message);
  process.exit(1);
});
