# Google Calendar Quick Start

Get your NanoClaw agents managing your calendar in 5 steps.

## ⚡ Quick Setup (5 minutes)

### 1. Get OAuth Credentials

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable "Google Calendar API"
4. Create OAuth 2.0 Client ID (Desktop app)
5. Download JSON → save as `gcp-oauth.keys.json`

### 2. Install Credentials

```bash
# Copy your downloaded credentials
cp ~/Downloads/client_secret_*.json \
   /home/dteske25/nanoclaw/mcp-servers/google-calendar/gcp-oauth.keys.json

# Set secure permissions
chmod 600 /home/dteske25/nanoclaw/mcp-servers/google-calendar/gcp-oauth.keys.json
```

### 3. Authenticate

```bash
cd /home/dteske25/nanoclaw/mcp-servers/google-calendar
npm run auth
```

Follow the browser prompts to grant calendar access.

### 4. Verify

```bash
# Should show the token file
ls -lah /home/dteske25/nanoclaw/mcp-servers/google-calendar/.gcp-saved-tokens.json
```

### 5. Restart (Already Running!)

Your NanoClaw is already configured! If you need to restart:

```bash
systemctl --user restart nanoclaw
```

## ✅ Test It

Send to your main Discord channel:

```
@nano What's on my calendar today?
```

Or:

```
@nano Schedule coffee chat with Alex tomorrow at 3pm
```

## 📚 What Your Agent Can Do

### View Calendar
- "What meetings do I have this week?"
- "Am I free tomorrow afternoon?"
- "Show my calendar for next Monday"

### Create Events
- "Schedule team standup every day at 9am"
- "Block out Friday for focus time"
- "Create a meeting with Sarah at 2pm tomorrow"

### Update Events
- "Move my 3pm meeting to 4pm"
- "Add John to the planning meeting"
- "Cancel my dentist appointment"

### Smart Features
- Extract event details from screenshots
- Find optimal meeting times
- Check multiple calendars
- Manage attendees and RSVPs

## 🔧 Troubleshooting

**"OAuth credentials not found"**
→ Make sure `gcp-oauth.keys.json` exists in `/home/dteske25/nanoclaw/mcp-servers/google-calendar/`

**"Token expired"**
→ Run `npm run auth` again in the MCP server directory

**Agent not responding to calendar requests**
→ Check logs: `journalctl --user -u nanoclaw -f | grep -i calendar`

## 📖 Full Documentation

See `docs/GOOGLE_CALENDAR_SETUP.md` for complete setup guide with troubleshooting.

---

**Configured on:** 2026-02-12
**MCP Server:** [galacoder/mcp-google-calendar](https://github.com/galacoder/mcp-google-calendar)
