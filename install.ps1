$ErrorActionPreference = 'Stop'

$claudeHome = if ($env:CLAUDE_HOME) { $env:CLAUDE_HOME } else { Join-Path $HOME '.claude' }
$dest = Join-Path $claudeHome 'skills\image-gen'
$src  = Join-Path $PSScriptRoot 'skills\image-gen'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js is required. https://nodejs.org'
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item (Join-Path $src 'SKILL.md')     $dest -Force
Copy-Item (Join-Path $src 'imagegen.mjs') $dest -Force

Write-Host "Installed to $dest"

if ((Get-Command codex -ErrorAction SilentlyContinue) -or $env:CODEX_BIN) {
  Write-Host 'Codex CLI found.'
} else {
  Write-Host ''
  Write-Host 'WARNING: Codex CLI not found on PATH.'
  Write-Host '  Install it:  npm install -g @openai/codex'
  Write-Host '  Then log in: codex login'
  Write-Host '  An ACTIVE paid ChatGPT plan is required.'
}

Write-Host ''
Write-Host 'Restart Claude Code to pick up the skill.'
