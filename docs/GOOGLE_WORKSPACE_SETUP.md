# Google Workspace MCP Integration Setup

This guide walks through setting up Google Workspace access for your NanoClaw agents using the taylorwilsdon/google_workspace_mcp server.

## Overview

Your agents now have comprehensive Google Workspace integration via MCP (Model Context Protocol), enabling them to:

### **📧 Gmail**
- Search, send, organize emails
- Advanced filtering and label management
- Complete email management

### **📅 Calendar**
- Create, update, delete events
- Full scheduling capabilities
- Check availability and manage multiple calendars

### **📁 Drive**
- Upload, download, search files
- Permission controls
- Office format support

### **📄 Docs, Sheets, Slides**
- Document creation, editing & comments
- Deep, exhaustive support for fine-grained editing
- Spreadsheet operations with flexible cell management
- Presentation creation and manipulation

### **📋 Forms, Tasks, Contacts, Chat**
- Form creation and response management
- Task and task list management
- Contact management via People API
- Space management & messaging

### **⚙️ Apps Script**
- Automate cross-application workflows
- Execute existing business logic
- Manage script projects and deployments

## Prerequisites

- Google Cloud Console access
- A Google account with Workspace access
- NanoClaw installed and running
- Container rebuilt with Python/uvx support (already done)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one):
   - Click "Select a project" → "NEW PROJECT"
   - Name it (e.g., "NanoClaw Workspace")
   - Click "CREATE"

## Step 2: Enable Google Workspace APIs

In your project, go to **APIs & Services** → **Library** and enable these APIs:

**Core Services:**
- ✅ Google Calendar API
- ✅ Gmail API
- ✅ Google Drive API

**Document Services:**
- ✅ Google Docs API
- ✅ Google Sheets API
- ✅ Google Slides API

**Additional Services:**
- ✅ Google Forms API
- ✅ Google Tasks API
- ✅ People API (for Contacts)
- ✅ Google Chat API (if using Google Workspace)
- ✅ Apps Script API

**Optional:**
- ✅ Custom Search API (if you want web search capabilities)

💡 **Tip:** You can enable these as you need them. Start with Calendar, Gmail, and Drive.

## Step 3: Create OAuth 2.0 Credentials

### Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **User Type**:
   - **External** (for personal Gmail accounts)
   - **Internal** (if you have Google Workspace)
3. Fill in the required fields:
   - **App name**: NanoClaw
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **SAVE AND CONTINUE**

### Add Scopes

1. Click **ADD OR REMOVE SCOPES**
2. Add these scopes (or filter to only what you need):

   **Gmail:**
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.labels`

   **Calendar:**
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar`

   **Drive:**
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`

   **Docs/Sheets/Slides:**
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/presentations`

   **Tasks & Contacts:**
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/contacts`

3. Click **UPDATE** then **SAVE AND CONTINUE**

### Add Test Users

1. Under **Test users**, click **+ ADD USERS**
2. Add your Google account email
3. Click **SAVE AND CONTINUE**

### Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Application type**: **Desktop app**
4. **Name**: NanoClaw Desktop Client
5. Click **CREATE**
6. Download the credentials JSON file:
   - Click the download button (⬇️) next to your new OAuth client
   - Save the file

## Step 4: Install OAuth Credentials

1. Save the downloaded credentials as `gcp-oauth.keys.json`:
   ```bash
   # If downloaded to ~/Downloads/client_secret_*.json
   mv ~/Downloads/client_secret_*.json /home/dteske25/nanoclaw/mcp-servers/google-workspace/gcp-oauth.keys.json
   ```

2. Set proper permissions:
   ```bash
   chmod 600 /home/dteske25/nanoclaw/mcp-servers/google-workspace/gcp-oauth.keys.json
   ```

## Step 5: Authenticate

The MCP server handles authentication automatically when first used. The OAuth flow will:

1. Detect that credentials exist but no token is saved
2. Generate an authorization URL
3. Open your browser to sign in to Google
4. Request permission for the scopes you configured
5. Save the refresh token to `/home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/`

**You'll authenticate the first time you use a Google Workspace tool from NanoClaw.**

## Step 6: Restart NanoClaw

Since the container and MCP configuration have been updated, restart the service:

```bash
systemctl --user restart nanoclaw
```

Or if using launchd (macOS):
```bash
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

## Step 7: Test the Integration

Send a message to your main group:

```
@nano What's on my calendar tomorrow?
```

Or:

```
@nano Check my Gmail inbox for unread messages
```

Or:

```
@nano Create a new Google Doc called "Meeting Notes"
```

The first time you use any Google Workspace tool, you'll be prompted to authenticate in your browser.

## Available Tool Tiers

The workspace MCP server supports tiered tool loading. You're currently using **"core"** tier which includes essential tools. You can switch tiers by editing `.mcp.json`:

- **core**: Essential tools (default, recommended)
- **extended**: Core + advanced features
- **complete**: All available tools

To change tiers, edit `/home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json` and change `--tool-tier core` to your desired tier.

## Configuration

Current configuration location:
- **MCP Config**: `/home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json`
- **OAuth Secrets**: `/home/dteske25/nanoclaw/mcp-servers/google-workspace/gcp-oauth.keys.json` (read-only mount)
- **OAuth Tokens**: `/home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/` (writable)

The credentials are stored in the `.claude` directory which persists between container runs but is isolated per group.

## Troubleshooting

### "OAuth credentials not found"

Make sure `gcp-oauth.keys.json` exists:
```bash
ls -lah /home/dteske25/nanoclaw/mcp-servers/google-workspace/gcp-oauth.keys.json
```

### "Failed to start MCP server"

Check container logs:
```bash
journalctl --user -u nanoclaw -f | grep -i "workspace\|mcp\|uv"
```

Or check the latest container log:
```bash
ls -lt /home/dteske25/nanoclaw/groups/main/logs/ | head -5
cat /home/dteske25/nanoclaw/groups/main/logs/container-*.log
```

### "API not enabled"

Go to Google Cloud Console → APIs & Services → Library → Search for the specific API → Enable it

### "Token expired" or "Authentication failed"

The server automatically refreshes tokens. If you need to re-authenticate, delete the token:
```bash
rm -rf /home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/*
```

Then use a workspace tool again to re-authenticate.

## Security Notes

- **OAuth tokens** are stored in `.claude/google-workspace-credentials/` with secure permissions
- **Credentials** in `gcp-oauth.keys.json` are mounted **read-only** in containers
- **OAuth secrets** should never be committed to git (already in .gitignore)
- **Tokens auto-refresh** before expiration
- **Per-group isolation**: Each group can have separate Google accounts

## Switching Back to Old Calendar MCP

If you need to switch back to the old calendar-only MCP:

```bash
# Restore old configuration
mv /home/dteske25/nanoclaw/mcp-servers/google-calendar.old /home/dteske25/nanoclaw/mcp-servers/google-calendar

# Edit .mcp.json to use old server
# Then restart NanoClaw
```

## Adding More Google Accounts

To add additional Google accounts (e.g., work + personal):

The workspace MCP server supports multi-account mode with OAuth 2.1. To enable this:

1. Edit the MCP configuration to enable OAuth 2.1
2. Each account will get its own authentication flow
3. Tools can specify which account to use

See the [workspace MCP documentation](https://github.com/taylorwilsdon/google_workspace_mcp) for multi-account setup.

---

**Sources:**
- [Google Workspace MCP Server](https://github.com/taylorwilsdon/google_workspace_mcp)
- [Google Workspace API Documentation](https://developers.google.com/workspace)
- [Model Context Protocol](https://modelcontextprotocol.io)
