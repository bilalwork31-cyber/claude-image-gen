# claude-image-gen

Real image assets inside Claude Code, generated on your existing ChatGPT subscription. No API key.

Claude is good at markup and bad at decoration. Left alone it reaches for hand written SVG blobs, CSS gradient "art" and emoji placeholders, and the page ends up looking like a template. This skill gives it a camera instead.

## What it does

- Generates photographic assets: hero backgrounds, product shots, textures, backdrops.
- Queues them. Enqueue returns in about 150 ms, so Claude keeps writing code while images render in a detached worker.
- Runs through the Codex CLI built in image tool, so billing rides your ChatGPT plan. There is no API key to create, store or leak.

## Requirements

- Node.js 18 or newer
- [Codex CLI](https://github.com/openai/codex), signed in with an **active paid ChatGPT plan**
- Claude Code

Verify Codex first. If this prints a path, you are ready:

```bash
codex exec "say ok"
```

## Install

macOS and Linux:

```bash
git clone https://github.com/bilalwork31-cyber/claude-image-gen
cd claude-image-gen && ./install.sh
```

Windows PowerShell:

```powershell
git clone https://github.com/bilalwork31-cyber/claude-image-gen
cd claude-image-gen; .\install.ps1
```

That copies two files into `~/.claude/skills/image-gen/`. Nothing else is touched. Restart Claude Code and it will discover the skill on its own.

## Use it

Just ask. "Build me a landing page for a coffee roaster" is enough once the skill is installed. Claude reads `SKILL.md` and batches the renders itself.

Manually, if you want:

```bash
node ~/.claude/skills/image-gen/imagegen.mjs generate "matte black ceramic cup on pale concrete, soft window light from the left, high end product photography" --out ./assets/hero.png --ar 16:9

node ~/.claude/skills/image-gen/imagegen.mjs status
```

| Flag | Values | Default |
|---|---|---|
| `--out` | output path | `./assets/<id>.png` |
| `--ar` | `1:1` `3:2` `2:3` `4:3` `3:4` `16:9` `9:16` `21:9` | `16:9` |
| `--quality` | `low` `medium` `high` | `high` |

`status` reports the pending count plus every job's state, path, byte size and error.

## Make it the default

Skills are discovered automatically, which makes them available. To make reaching for one a reflex, add a note to `~/.claude/CLAUDE.md`. See [`CLAUDE.md.example`](CLAUDE.md.example) for the block this repo suggests.

## Why it queues

Each render takes 60 to 90 seconds. Doing that inline would stall the session once per image. Instead every asset is queued up front, Claude writes the HTML and CSS while the worker renders, and `status` is checked once at the end.

## Known gotcha, worth reading

If renders fail with `no image produced`, **check that the ChatGPT subscription is actually active.**

A lapsed plan still hands out a token claiming `plan: plus`, and every local check keeps reporting healthy. `codex features list` shows `image_generation stable true`, the session feature list includes `ImageGeneration`, `codex doctor` reports auth fine. The tool is withheld server side and nothing local reveals it. Finding this cost an entire evening.

## What it will not do

Logos, icons, charts, diagrams, and anything containing text. Image models still butcher lettering. Those stay as real SVG and real type. The skill instructs Claude accordingly.

## License

MIT
