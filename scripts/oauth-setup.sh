#!/bin/bash
# One-time OAuth setup for Google Workspace MCP
# Usage: ./scripts/oauth-setup.sh your-email@gmail.com
#
# If running on a remote host, first set up SSH port forwarding:
#   ssh -L 8000:localhost:8000 <host>

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$1" ]; then
  echo "Usage: $0 <your-google-email>"
  echo "  e.g. $0 you@gmail.com"
  exit 1
fi

~/.local/bin/uv run "$SCRIPT_DIR/oauth-setup.py" "$1"
