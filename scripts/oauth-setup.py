#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "google-auth>=2.0",
#   "google-auth-oauthlib>=1.0",
#   "google-api-python-client>=2.0",
# ]
# ///
"""
One-time OAuth setup for Google Workspace MCP.
Run with: uv run scripts/oauth-setup.py <your-email@gmail.com>

Starts a local server on port 8000, prints an auth URL, and waits
for the callback. Use SSH port forwarding if running on a remote host:
  ssh -L 8000:localhost:8000 <host>
"""
import json
import os
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/documents.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/presentations.readonly",
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/forms.body.readonly",
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/tasks.readonly",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/chat.messages",
    "https://www.googleapis.com/auth/chat.messages.readonly",
    "https://www.googleapis.com/auth/chat.spaces",
    "https://www.googleapis.com/auth/cse",
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/script.projects.readonly",
    "https://www.googleapis.com/auth/script.deployments",
    "https://www.googleapis.com/auth/script.deployments.readonly",
    "https://www.googleapis.com/auth/script.processes",
    "https://www.googleapis.com/auth/script.metrics",
]

def main():
    if len(sys.argv) < 2:
        print(f"Usage: uv run {sys.argv[0]} <your-email@gmail.com>")
        sys.exit(1)

    user_email = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    secrets_file = os.path.join(project_dir, "mcp-servers", "google-workspace", "gcp-oauth.keys.json")
    creds_dir = os.path.join(project_dir, "data", "sessions", "main", ".claude", "google-workspace-credentials")
    creds_file = os.path.join(creds_dir, f"{user_email}.json")

    os.makedirs(creds_dir, exist_ok=True)

    if not os.path.exists(secrets_file):
        print(f"ERROR: Client secrets file not found: {secrets_file}")
        sys.exit(1)

    print("=== Google Workspace OAuth Setup ===")
    print(f"Email:        {user_email}")
    print(f"Secrets file: {secrets_file}")
    print(f"Creds file:   {creds_file}")
    print()
    print("A browser window will open (or a URL will be printed).")
    print("If on a remote host, make sure you have SSH port forwarding:")
    print("  ssh -L 8000:localhost:8000 <host>")
    print()

    # Allow HTTP for localhost
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    flow = InstalledAppFlow.from_client_secrets_file(secrets_file, scopes=SCOPES)

    # run_local_server blocks until the user completes auth
    # open_browser=False so it just prints the URL (useful for remote/headless)
    credentials = flow.run_local_server(
        port=8000,
        open_browser=False,
        prompt="consent",
        access_type="offline",
    )

    # Save credentials in the format the MCP expects
    creds_data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes) if credentials.scopes else SCOPES,
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
    }

    with open(creds_file, "w") as f:
        json.dump(creds_data, f, indent=2)

    print()
    print(f"SUCCESS! Credentials saved to: {creds_file}")
    print()
    print("The NanoClaw agent should now be able to use Google Workspace tools.")
    print("Restart the agent container or send a new message to test.")

if __name__ == "__main__":
    main()
