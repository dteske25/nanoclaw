# Google Workspace MCP Migration - Complete! ✅

## What We Did

Successfully migrated from `galacoder/mcp-google-calendar` to `taylorwilsdon/google_workspace_mcp`.

### Changes Made

#### 1. **Container Updates**
- ✅ Added Python 3.11 to container
- ✅ Installed `uv`/`uvx` for Python package management
- ✅ Rebuilt container image: `nanoclaw-agent:latest`

#### 2. **MCP Server Installation**
- ✅ Backed up old calendar MCP: `/home/dteske25/nanoclaw/mcp-servers/google-calendar.old`
- ✅ Installed workspace MCP: `/home/dteske25/nanoclaw/mcp-servers/google-workspace`
- ✅ Copied OAuth credentials: `gcp-oauth.keys.json`

#### 3. **Configuration Updates**
- ✅ Updated MCP config: `/home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json`
- ✅ Set credentials directory: `.claude/google-workspace-credentials/`
- ✅ Configured tool tier: `core` (essential tools)
- ✅ Stateless mode: `false` (file-based tokens)

#### 4. **Documentation**
- ✅ Created: `docs/GOOGLE_WORKSPACE_SETUP.md` (full setup guide)
- ✅ Created: `docs/GOOGLE_WORKSPACE_QUICK_START.md` (quick migration)
- ✅ Archived old calendar docs

#### 5. **Service**
- ✅ NanoClaw restarted and running

## What's Available Now

Instead of just **Google Calendar**, your agents now have access to:

| Service | Capabilities |
|---------|-------------|
| 📧 **Gmail** | Search, send, organize emails; label management |
| 📅 **Calendar** | Create, update, delete events; scheduling; availability |
| 📁 **Drive** | Upload, download, search files; permissions |
| 📄 **Docs** | Document creation, editing, comments |
| 📊 **Sheets** | Spreadsheet operations, cell management |
| 📽️ **Slides** | Presentation creation and updates |
| 📋 **Forms** | Form creation and response management |
| ✅ **Tasks** | Task and task list management |
| 👥 **Contacts** | Contact management via People API |
| 💬 **Chat** | Spaces and messaging (Workspace only) |
| ⚙️ **Apps Script** | Custom automation and workflows |

## What You Need to Do

### Required: Update Google Cloud Project

Your existing OAuth credentials need updated scopes for the new services:

1. **Enable Additional APIs** (in [Google Cloud Console](https://console.cloud.google.com/)):
   - Gmail API
   - Google Drive API
   - Google Docs API
   - Google Sheets API
   - Google Slides API
   - (Enable others as needed)

2. **Add Scopes to OAuth Consent Screen**:
   - Go to: APIs & Services → OAuth consent screen → EDIT APP → Scopes
   - Add scopes for each enabled API (see `docs/GOOGLE_WORKSPACE_SETUP.md` for list)

3. **Re-authenticate** (delete old tokens):
   ```bash
   rm -rf /home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/*
   ```

4. **Test it** by messaging your agent:
   ```
   @nano What's on my calendar today?
   ```

   The first use will prompt you to authenticate in your browser.

### Optional: Explore Other Services

Try messaging your agent:
- `@nano Check my Gmail inbox`
- `@nano Create a Google Doc called "Test"`
- `@nano Upload a file to my Drive`
- `@nano What tasks do I have?`

## Tool Tiers

You're using the **core** tier (recommended). To change:

Edit `/home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json`:
- `--tool-tier core` → Essential tools (current)
- `--tool-tier extended` → Core + advanced features
- `--tool-tier complete` → All available tools

Then restart: `systemctl --user restart nanoclaw`

## Configuration Locations

| File | Purpose |
|------|---------|
| `/home/dteske25/nanoclaw/mcp-servers/google-workspace/` | MCP server code (read-only in container) |
| `/home/dteske25/nanoclaw/mcp-servers/google-workspace/gcp-oauth.keys.json` | OAuth client secrets (600 permissions) |
| `/home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json` | MCP server configuration |
| `/home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/` | OAuth tokens (auto-created, writable) |

## Rollback (if needed)

To switch back to the old calendar-only MCP:

```bash
# Restore old server
mv /home/dteske25/nanoclaw/mcp-servers/google-calendar.old /home/dteske25/nanoclaw/mcp-servers/google-calendar

# Restore old config
cat > /home/dteske25/nanoclaw/data/sessions/main/.claude/mcp.json <<'EOF'
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["/workspace/mcp-servers/google-calendar/build/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
EOF

# Restart
systemctl --user restart nanoclaw
```

## Troubleshooting

### MCP Server Not Starting

Check logs:
```bash
journalctl --user -u nanoclaw -f | grep -i workspace
```

Or check container logs:
```bash
ls -lt /home/dteske25/nanoclaw/groups/main/logs/ | head -5
cat /home/dteske25/nanoclaw/groups/main/logs/container-*.log
```

### Authentication Issues

1. Verify credentials exist:
   ```bash
   ls -lah /home/dteske25/nanoclaw/mcp-servers/google-workspace/gcp-oauth.keys.json
   ```

2. Delete tokens and re-authenticate:
   ```bash
   rm -rf /home/dteske25/nanoclaw/data/sessions/main/.claude/google-workspace-credentials/*
   ```

3. Check that APIs are enabled in Google Cloud Console

### Still Not Working?

See full troubleshooting guide: `docs/GOOGLE_WORKSPACE_SETUP.md`

---

## Next Steps

1. ✅ **Update Google Cloud scopes** (required)
2. ✅ **Test basic functionality** with calendar query
3. ✅ **Try other services** (Gmail, Drive, Docs)
4. ⏭️ **Explore advanced features** (Apps Script, multi-calendar)

**Documentation:**
- Full setup: `docs/GOOGLE_WORKSPACE_SETUP.md`
- Quick start: `docs/GOOGLE_WORKSPACE_QUICK_START.md`
- Server repo: https://github.com/taylorwilsdon/google_workspace_mcp

---

Migration completed on: 2026-02-12
