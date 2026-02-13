# Google Calendar Integration Setup

This guide walks through setting up Google Calendar access for your NanoClaw agents.

## Overview

Your agents now have full Google Calendar integration via MCP (Model Context Protocol), enabling them to:
- List all your calendars
- View events and availability
- Create new calendar events
- Update existing events
- Delete events
- Extract event details from images/screenshots
- Find free time slots
- Manage attendees

## Prerequisites

- Google Cloud Console access
- A Google account with calendar access
- NanoClaw installed and running

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one):
   - Click "Select a project" → "NEW PROJECT"
   - Name it (e.g., "NanoClaw Calendar")
   - Click "CREATE"

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **ENABLE**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - **User Type**: External (or Internal if you have Google Workspace)
   - **App name**: NanoClaw
   - **User support email**: Your email
   - **Developer contact**: Your email
   - **Scopes**: Add `https://www.googleapis.com/auth/calendar.events`
   - **Test users**: Add your Google account email
   - Click **SAVE AND CONTINUE**
4. Back to creating OAuth client ID:
   - **Application type**: Desktop app
   - **Name**: NanoClaw Desktop Client
   - Click **CREATE**
5. Download the credentials JSON file
   - Click the download button (⬇️) next to your new OAuth client
   - Save as `gcp-oauth.keys.json`

## Step 4: Install OAuth Credentials

1. Copy the downloaded credentials to the MCP server directory:
   ```bash
   cp ~/Downloads/gcp-oauth.keys.json /home/dteske25/nanoclaw/mcp-servers/google-calendar/gcp-oauth.keys.json
   ```

2. Set proper permissions:
   ```bash
   chmod 600 /home/dteske25/nanoclaw/mcp-servers/google-calendar/gcp-oauth.keys.json
   ```

## Step 5: Authenticate

1. Run the authentication command:
   ```bash
   cd /home/dteske25/nanoclaw/mcp-servers/google-calendar
   npm run auth
   ```

2. Follow the prompts:
   - A browser window will open
   - Sign in to your Google account
   - Grant calendar access permissions
   - You'll see "Authentication successful!"

3. Verify the token file was created:
   ```bash
   ls -lah /home/dteske25/nanoclaw/mcp-servers/google-calendar/.gcp-saved-tokens.json
   ```

   Should show a file with 600 permissions.

## Step 6: Rebuild and Restart NanoClaw

1. Rebuild the TypeScript:
   ```bash
   cd /home/dteske25/nanoclaw
   npm run build
   ```

2. Restart the service:
   ```bash
   systemctl --user restart nanoclaw
   ```

3. Check the logs for successful MCP server connection:
   ```bash
   journalctl --user -u nanoclaw -f | grep -i calendar
   ```

## Step 7: Test the Integration

Send a message to your main group:

```
@nano What's on my calendar tomorrow?
```

Or:

```
@nano Schedule a meeting with John at 2pm tomorrow
```

The agent should now be able to access your Google Calendar!

## Available Tools

Once configured, your agents can use these MCP tools:

### List Calendars
```
list-calendars
```
Shows all calendars you have access to.

### List Events
```
list-events
  calendarId: "primary" (or specific calendar ID)
  timeMin: "2026-02-13T00:00:00Z" (optional)
  timeMax: "2026-02-14T00:00:00Z" (optional)
  maxResults: 10 (optional)
```

### Create Event
```
create-event
  calendarId: "primary"
  summary: "Meeting with team"
  description: "Quarterly planning"
  startDateTime: "2026-02-13T14:00:00-06:00"
  endDateTime: "2026-02-13T15:00:00-06:00"
  attendees: ["email@example.com"] (optional)
  location: "Conference Room A" (optional)
```

### Update Event
```
update-event
  calendarId: "primary"
  eventId: "abc123..."
  summary: "Updated title"
  startDateTime: "2026-02-13T15:00:00-06:00"
  endDateTime: "2026-02-13T16:00:00-06:00"
```

### Delete Event
```
delete-event
  calendarId: "primary"
  eventId: "abc123..."
```

## Troubleshooting

### "OAuth credentials not found"

Make sure `gcp-oauth.keys.json` is in the correct location:
```bash
ls /home/dteske25/nanoclaw/mcp-servers/google-calendar/gcp-oauth.keys.json
```

### "Token expired" or "Authentication failed"

Re-run the auth command:
```bash
cd /home/dteske25/nanoclaw/mcp-servers/google-calendar
npm run auth
```

### "Calendar API not enabled"

Go to Google Cloud Console → APIs & Services → Library → Search "Calendar" → Enable the Calendar API

### MCP server not connecting

1. Check the mcp.json configuration:
   ```bash
   cat /home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json
   ```

2. Verify the MCP server builds successfully:
   ```bash
   cd /home/dteske25/nanoclaw/mcp-servers/google-calendar
   npm run build
   node build/index.js
   ```
   (Should start without errors - press Ctrl+C to exit)

3. Check container logs:
   ```bash
   journalctl --user -u nanoclaw -n 100 | grep -i mcp
   ```

## Security Notes

- **OAuth tokens** are stored in `.gcp-saved-tokens.json` with 600 permissions (owner read/write only)
- **Credentials** in `gcp-oauth.keys.json` should never be committed to git (already in .gitignore)
- **Tokens auto-refresh** before expiration
- **Mounted read-only** in containers for security

## Token Refresh

The MCP server automatically refreshes tokens before they expire. If you need to manually refresh:

```bash
cd /home/dteske25/nanoclaw/mcp-servers/google-calendar
rm .gcp-saved-tokens.json
npm run auth
```

## Adding Additional Google Services

The same OAuth client can be used for other Google services (Drive, Gmail, etc.) by:
1. Enabling the additional APIs in Google Cloud Console
2. Adding the required scopes to your OAuth consent screen
3. Re-running `npm run auth`
4. Installing the appropriate MCP servers

---

**Sources:**
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Calendar MCP Server](https://github.com/galacoder/mcp-google-calendar)
- [Model Context Protocol](https://modelcontextprotocol.io)
