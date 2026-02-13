# Google Workspace Quick Start

Already have OAuth credentials from the old setup? Here's the quick migration path.

## What Changed

✅ **Upgraded from:** `galacoder/mcp-google-calendar` (calendar only)
✅ **Upgraded to:** `taylorwilsdon/google_workspace_mcp` (12 services!)

## Quick Setup

### 1. Enable Additional APIs

Your existing OAuth credentials work! Just enable more APIs in [Google Cloud Console](https://console.cloud.google.com/):

**Already enabled:**
- ✅ Google Calendar API

**Add these (optional, enable as needed):**
- Gmail API
- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API
- Google Forms API
- Google Tasks API
- People API (Contacts)
- Google Chat API
- Apps Script API

### 2. Update OAuth Scopes

1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **EDIT APP**
3. Under **Scopes**, click **ADD OR REMOVE SCOPES**
4. Add the scopes for services you enabled (see full list in [GOOGLE_WORKSPACE_SETUP.md](./GOOGLE_WORKSPACE_SETUP.md))
5. Click **UPDATE** and **SAVE AND CONTINUE**

### 3. Delete Old Tokens

Since scopes changed, delete old tokens to re-authenticate:

```bash
rm -rf /home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/*
```

### 4. Restart NanoClaw

```bash
systemctl --user restart nanoclaw
```

### 5. Test It

Message your agent:

```
@nano What's on my calendar today and any unread emails?
```

The first time you use a Google Workspace tool, you'll authenticate in your browser.

## What You Get

Instead of just Calendar, you now have:

📧 **Gmail** - Read, send, organize email
📅 **Calendar** - Full calendar management
📁 **Drive** - File operations
📄 **Docs/Sheets/Slides** - Document editing
📋 **Forms/Tasks** - Forms and task management
👥 **Contacts** - Contact management
💬 **Chat** - Google Chat/Spaces (Workspace only)
⚙️ **Apps Script** - Custom automation

## Need Help?

See the full setup guide: [GOOGLE_WORKSPACE_SETUP.md](./GOOGLE_WORKSPACE_SETUP.md)
