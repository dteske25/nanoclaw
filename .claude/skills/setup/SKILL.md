---
name: setup
description: Run initial NanoClaw setup. Use when user wants to install dependencies, configure Discord bot, register their main channel, or start the background services. Triggers on "setup", "install", "configure nanoclaw", or first-time setup requests.
---

# NanoClaw Setup

Run all commands automatically. Only pause when user action is required (creating Discord bot).

**UX Note:** When asking the user questions, prefer using the `AskUserQuestion` tool instead of just outputting text. This integrates with Claude's built-in question/answer system for a better experience.

## 1. Check Prerequisites

### 1a. Node.js

```bash
node --version 2>/dev/null || echo "NOT INSTALLED"
```

If not installed, tell the user:
> Node.js 20+ is required. Install it from https://nodejs.org/ or use a version manager like `fnm` or `nvm`.

Wait for confirmation, then verify the version is 20+.

### 1b. Install npm dependencies

```bash
npm install
```

## 2. Install Docker

Check if Docker is installed and running:

```bash
docker --version && docker info >/dev/null 2>&1 && echo "Docker is running" || echo "Docker not running or not installed"
```

If not installed or not running, tell the user:
> Docker is required for running agents in isolated environments.
>
> **macOS:**
> 1. Download Docker Desktop from https://docker.com/products/docker-desktop
> 2. Install and start Docker Desktop
> 3. Wait for the whale icon in the menu bar to stop animating
>
> **Linux:**
> ```bash
> curl -fsSL https://get.docker.com | sh
> sudo systemctl start docker
> sudo usermod -aG docker $USER  # Then log out and back in
> ```
>
> Let me know when you've completed these steps.

Wait for user confirmation, then verify:

```bash
docker run --rm hello-world
```

## 3. Configure Claude Authentication

Ask the user:
> Do you want to use your **Claude subscription** (Pro/Max) or an **Anthropic API key**?

### Option 1: Claude Subscription (Recommended)

Tell the user:
> You need **Claude Code** installed to generate an OAuth token. If you don't have it:
> ```
> npm install -g @anthropic-ai/claude-code
> ```
>
> Then in another terminal window, run:
> ```
> claude setup-token
> ```
> A browser window will open for you to log in. Once authenticated, the token will be displayed in your terminal. Either:
> 1. Paste it here and I'll add it to `.env` for you, or
> 2. Add it to `.env` yourself as `CLAUDE_CODE_OAUTH_TOKEN=<your-token>`

If they give you the token, add it to `.env`:

```bash
echo "CLAUDE_CODE_OAUTH_TOKEN=<token>" > .env
```

### Option 2: API Key

Ask if they have an existing key to copy or need to create one.

**Copy existing:**
```bash
grep "^ANTHROPIC_API_KEY=" /path/to/source/.env > .env
```

**Create new:**
```bash
echo 'ANTHROPIC_API_KEY=' > .env
```

Tell the user to add their key from https://console.anthropic.com/

**Verify:**
```bash
KEY=$(grep "^ANTHROPIC_API_KEY=" .env | cut -d= -f2)
[ -n "$KEY" ] && echo "API key configured: ${KEY:0:10}...${KEY: -4}" || echo "Missing"
```

## 4. Build Container Image

Build the NanoClaw agent container:

```bash
./container/build.sh
```

This creates the `nanoclaw-agent:latest` image with Node.js, Chromium, Claude Code CLI, and agent-browser.

Verify the build succeeded:

```bash
docker images | grep nanoclaw-agent
echo '{}' | docker run -i --entrypoint /bin/echo nanoclaw-agent:latest "Container OK" || echo "Container build failed"
```

## 5. Configure Discord Bot

**USER ACTION REQUIRED**

Tell the user:
> You need to create a Discord bot. Here's how:
>
> 1. Go to https://discord.com/developers/applications
> 2. Click **New Application**, give it a name (e.g., "nano")
> 3. Go to the **Bot** tab:
>    - Click **Reset Token** and copy the token
>    - Under **Privileged Gateway Intents**, enable **Message Content Intent**
> 4. Go to the **OAuth2** tab:
>    - Under **OAuth2 URL Generator**, select scopes: `bot`
>    - Under **Bot Permissions**, select: `Send Messages`, `Read Message History`, `View Channels`
>    - Copy the generated URL and open it in your browser to invite the bot to your server
>
> Paste your bot token here.

When they provide the token, append it to `.env`:

```bash
echo "DISCORD_BOT_TOKEN=<token>" >> .env
```

Verify:
```bash
TOKEN=$(grep "^DISCORD_BOT_TOKEN=" .env | cut -d= -f2)
[ -n "$TOKEN" ] && echo "Discord bot token configured: ${TOKEN:0:10}..." || echo "Missing"
```

## 6. Configure Assistant Name and Main Channel

### 6a. Ask for trigger word

Ask the user:
> What name do you want for your assistant? (default: `nano`)
>
> In servers, @mentioning the bot will trigger it.
> In DMs, no mention is needed — all messages are processed.

Store their choice for use in the steps below.

### 6b. Explain security model

**Use the AskUserQuestion tool** to present this:

> **Important: Your "main" channel is your admin control portal.**
>
> The main channel has elevated privileges:
> - Can see messages from ALL other registered groups
> - Can manage and delete tasks across all groups
> - Can write to global memory that all groups can read
> - Has read-write access to the entire NanoClaw project
>
> **Recommendation:** Use DMs with the bot as your main channel. This ensures only you have admin control.
>
> **Question:** Which setup will you use for your main channel?
>
> Options:
> 1. DMs with the bot (Recommended)
> 2. A Discord server channel

### 6c. Register the main channel

First build, then start the app briefly to connect to Discord and sync guild metadata. Use the Bash tool's timeout parameter (15000ms). The app will be killed when the timeout fires, which is expected.

```bash
npm run build
```

Then run briefly (set Bash tool timeout to 15000ms):
```bash
npm run dev
```

**For DMs** (they chose option 1):

Ask the user for their Discord user ID. They can get it by enabling Developer Mode in Discord settings, then right-clicking their name and selecting "Copy User ID". The JID will be `dm:{USER_ID}`.

**For server** (they chose option 2):

Guilds are synced on startup. Query the database for recent guilds:
```bash
sqlite3 store/messages.db "SELECT jid, name FROM chats WHERE jid LIKE 'guild:%' ORDER BY last_message_time DESC LIMIT 20"
```

Show the guild names to the user and ask them to pick one.

### 6d. Write the configuration

Once you have the JID, configure it. Use the assistant name from step 6a.

For DMs (no trigger needed), set `requiresTrigger` to `false`:

```json
{
  "JID_HERE": {
    "name": "main",
    "folder": "main",
    "trigger": "@ASSISTANT_NAME",
    "added_at": "CURRENT_ISO_TIMESTAMP",
    "requiresTrigger": false
  }
}
```

For servers, keep `requiresTrigger` as `true` (default).

Write to the database directly by creating a temporary registration script, or write `data/registered_groups.json` which will be auto-migrated on first run:

```bash
mkdir -p data
```

Then write `data/registered_groups.json` with the correct JID, trigger, and timestamp.

If the user chose a name other than `nano`, also update:
1. `groups/global/CLAUDE.md` - Change "# nano" and "You are nano" to the new name
2. `groups/main/CLAUDE.md` - Same changes at the top

Ensure the groups folder exists:
```bash
mkdir -p groups/main/logs
```

## 7. Configure External Directory Access (Mount Allowlist)

Ask the user:
> Do you want the agent to be able to access any directories **outside** the NanoClaw project?
>
> Examples: Git repositories, project folders, documents you want Claude to work on.
>
> **Note:** This is optional. Without configuration, agents can only access their own group folders.

If **no**, create an empty allowlist to make this explicit:

```bash
mkdir -p ~/.config/nanoclaw
cat > ~/.config/nanoclaw/mount-allowlist.json << 'EOF'
{
  "allowedRoots": [],
  "blockedPatterns": [],
  "nonMainReadOnly": true
}
EOF
echo "Mount allowlist created - no external directories allowed"
```

Skip to the next step.

If **yes**, ask follow-up questions:

### 7a. Collect Directory Paths

Ask the user:
> Which directories do you want to allow access to?
>
> You can specify:
> - A parent folder like `~/projects` (allows access to anything inside)
> - Specific paths like `~/repos/my-app`
>
> List them one per line, or give me a comma-separated list.

For each directory they provide, ask:
> Should `[directory]` be **read-write** (agents can modify files) or **read-only**?
>
> Read-write is needed for: code changes, creating files, git commits
> Read-only is safer for: reference docs, config examples, templates

### 7b. Configure Non-Main Group Access

Ask the user:
> Should **non-main groups** (other Discord servers you add later) be restricted to **read-only** access even if read-write is allowed for the directory?
>
> Recommended: **Yes** - this prevents other groups from modifying files even if you grant them access to a directory.

### 7c. Create the Allowlist

Create the allowlist file based on their answers:

```bash
mkdir -p ~/.config/nanoclaw
```

Then write the JSON file. Example for a user who wants `~/projects` (read-write) and `~/docs` (read-only) with non-main read-only:

```bash
cat > ~/.config/nanoclaw/mount-allowlist.json << 'EOF'
{
  "allowedRoots": [
    {
      "path": "~/projects",
      "allowReadWrite": true,
      "description": "Development projects"
    },
    {
      "path": "~/docs",
      "allowReadWrite": false,
      "description": "Reference documents"
    }
  ],
  "blockedPatterns": [],
  "nonMainReadOnly": true
}
EOF
```

Verify the file:

```bash
cat ~/.config/nanoclaw/mount-allowlist.json
```

Tell the user:
> Mount allowlist configured. The following directories are now accessible:
> - `~/projects` (read-write)
> - `~/docs` (read-only)
>
> **Security notes:**
> - Sensitive paths (`.ssh`, `.gnupg`, `.aws`, credentials) are always blocked
> - This config file is stored outside the project, so agents cannot modify it
> - Changes require restarting the NanoClaw service
>
> To grant a group access to a directory, add it to their config in `data/registered_groups.json`:
> ```json
> "containerConfig": {
>   "additionalMounts": [
>     { "hostPath": "~/projects/my-app" }
>   ]
> }
> ```
> The folder appears inside the container at `/workspace/extra/<folder-name>` (derived from the last segment of the path). Add `"readonly": false` for write access, or `"containerPath": "custom-name"` to override the default name.

## 8. Configure Background Service

First detect the platform:

```bash
uname -s
```

### macOS (launchd)

Generate the plist file with correct paths automatically:

```bash
NODE_PATH=$(readlink -f $(which node) || which node)
PROJECT_PATH=$(pwd)
HOME_PATH=$HOME

cat > ~/Library/LaunchAgents/com.nanoclaw.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nanoclaw</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${PROJECT_PATH}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_PATH}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:${HOME_PATH}/.local/bin</string>
        <key>HOME</key>
        <string>${HOME_PATH}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${PROJECT_PATH}/logs/nanoclaw.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_PATH}/logs/nanoclaw.error.log</string>
</dict>
</plist>
EOF

echo "Created launchd plist with:"
echo "  Node: ${NODE_PATH}"
echo "  Project: ${PROJECT_PATH}"
```

Build and start the service:

```bash
npm run build
mkdir -p logs
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

Verify it's running:
```bash
launchctl list | grep nanoclaw
```

### Linux (systemd)

Generate the systemd user service with correct paths automatically. Use `readlink -f $(which node)` to resolve the real node binary path (important if using fnm, nvm, or other version managers whose paths are ephemeral):

```bash
NODE_PATH=$(readlink -f $(which node))
NODE_DIR=$(dirname "$NODE_PATH")
PROJECT_PATH=$(pwd)
HOME_PATH=$HOME

mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/nanoclaw.service << EOF
[Unit]
Description=NanoClaw - Personal Claude Assistant
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_PATH}
ExecStart=${NODE_PATH} ${PROJECT_PATH}/dist/index.js
Restart=always
RestartSec=5
Environment=PATH=${NODE_DIR}:/usr/local/bin:/usr/bin:/bin
Environment=HOME=${HOME_PATH}
StandardOutput=append:${PROJECT_PATH}/logs/nanoclaw.log
StandardError=append:${PROJECT_PATH}/logs/nanoclaw.error.log

[Install]
WantedBy=default.target
EOF

echo "Created systemd service with:"
echo "  Node: ${NODE_PATH}"
echo "  Project: ${PROJECT_PATH}"
```

Build and start the service:

```bash
npm run build
mkdir -p logs
systemctl --user daemon-reload
systemctl --user enable nanoclaw.service
systemctl --user start nanoclaw.service
```

Verify it's running:
```bash
systemctl --user status nanoclaw.service
```

**Important:** For the systemd user service to run when not logged in, enable lingering:
```bash
loginctl enable-linger $(whoami)
```

## 9. Test

Tell the user (using the assistant name they configured):
> Send a DM to the bot, or @mention it in a registered server.
>
> **Tip:** In DMs, you don't need to @mention — just send a message and the agent will respond.

Check the logs:
```bash
tail -f logs/nanoclaw.log
```

The user should receive a response in Discord.

## Troubleshooting

**Service not starting**: Check `logs/nanoclaw.error.log`

**Container agent fails with "Claude Code process exited with code 1"**:
- Ensure Docker is running: `docker info` (start Docker Desktop on macOS, or `sudo systemctl start docker` on Linux)
- Check container logs: `cat groups/main/logs/container-*.log | tail -50`

**No response to messages**:
- Verify the bot is in the server and has the correct permissions
- DMs don't require a mention — all messages are processed
- Server messages require an @mention of the bot
- Check that the chat JID is in the database: `sqlite3 store/messages.db "SELECT * FROM registered_groups"`
- Check `logs/nanoclaw.log` for errors

**Discord bot not connecting**:
- Verify `DISCORD_BOT_TOKEN` is set in `.env`
- Make sure **Message Content Intent** is enabled in the Discord Developer Portal
- Restart the service:
  - macOS: `launchctl kickstart -k gui/$(id -u)/com.nanoclaw`
  - Linux: `systemctl --user restart nanoclaw`

**Stop/unload service**:
- macOS: `launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist`
- Linux: `systemctl --user stop nanoclaw`
