#!/usr/bin/env bash
set -euo pipefail

DEST="${CLAUDE_HOME:-$HOME/.claude}/skills/image-gen"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/skills/image-gen"

command -v node >/dev/null || { echo "Node.js is required. https://nodejs.org"; exit 1; }

mkdir -p "$DEST"
cp "$SRC/SKILL.md" "$SRC/imagegen.mjs" "$DEST/"
chmod +x "$DEST/imagegen.mjs"

echo "Installed to $DEST"

if command -v codex >/dev/null || [ -n "${CODEX_BIN:-}" ]; then
  echo "Codex CLI found."
else
  echo
  echo "WARNING: Codex CLI not found on PATH."
  echo "  Install it:  npm install -g @openai/codex"
  echo "  Then log in: codex login"
  echo "  An ACTIVE paid ChatGPT plan is required."
fi

echo
echo "Restart Claude Code to pick up the skill."
