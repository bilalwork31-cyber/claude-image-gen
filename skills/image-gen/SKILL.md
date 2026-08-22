---
name: image-gen
description: Generate real photographic and textured image assets (hero backgrounds, product shots, textures, backdrops) instead of hand written SVG. Use whenever a site, landing page, deck or UI needs imagery that should look expensive. Renders in the background so the session never blocks.
---

# Image generation

Queued renderer backed by the Codex built-in imagegen tool on the ChatGPT subscription. No API key. Enqueue returns immediately, a detached worker renders, you keep working.

## Generate

```bash
node ~/.claude/skills/image-gen/imagegen.mjs generate "PROMPT" --out ./public/hero.png --ar 16:9
```

Returns `{"id":"...","out":"...","state":"queued"}` in about 150 ms. Fire off every asset a page needs in one batch, then continue building the markup.

| Flag | Values | Default |
|---|---|---|
| `--out` | output path | `./assets/<id>.png` |
| `--ar` | `1:1` `3:2` `2:3` `4:3` `3:4` `16:9` `9:16` `21:9` | `16:9` |
| `--quality` | `low` `medium` `high` | `high` |

## Check

```bash
node ~/.claude/skills/image-gen/imagegen.mjs status
```

Reports `pending` count plus each job's state, path and byte size. Poll near the end of the task, not after every enqueue.

## Rules

- Batch first. Enqueue every asset up front, write the HTML and CSS while they render, then verify with `status`.
- Never block waiting on a render. If jobs are still pending when the code is done, say so and check again.
- Use this for photography, textures, gradients, backdrops, product shots and abstract art.
- Do NOT use this for logos, icons, charts or anything containing text. Those stay as SVG or real type.
- Prompt like a photographer: subject, surface, lighting direction, lens feel, mood. Name no brands and no real people.
- A failed job records its error in `status`. Report the error, do not silently retry more than once.
- Each render takes roughly 60 to 90 seconds, so batching matters.

## Requirements

Codex CLI, logged in with an ACTIVE ChatGPT paid subscription. The `image_gen` tool is withheld server side when a subscription lapses, even though the stored token still claims `plan: plus`. If renders start failing with "no image produced", check the subscription before debugging anything else.

Binary is located automatically. Override with `CODEX_BIN` if it moves.
