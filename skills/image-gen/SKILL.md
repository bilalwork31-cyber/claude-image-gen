---
name: image-gen
description: Generate real image assets (hero backgrounds, product shots, logos, icons, buttons, textures, infographics, transparent cutouts) instead of hand written SVG or CSS shapes. Use whenever a site, landing page, deck or UI needs visuals that should look expensive. Renders in the background so the session never blocks.
---

# Image generation

Queued renderer backed by the Codex built in imagegen tool (`gpt-image-2`) on the ChatGPT subscription. No API key. Enqueue returns immediately, a detached worker renders, you keep working.

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
| `--bg` | `auto` `transparent` `opaque` | `auto` |
| `--ref` | path to a reference image, repeatable | none |

`--ref` attaches a real image to the request, so the render stays faithful to artwork you already own instead of inventing its own version. Use it for anything carrying brand identity: a logo rendered as a physical object, an icon set that must match an existing mark, product shots of a real device, or a second asset that has to share a subject with the first. Repeat the flag for multiple references.

```bash
node ~/.claude/skills/image-gen/imagegen.mjs generate "the logo milled from matte black aluminium, raking light" \
  --ref ./assets/logo.png --out ./assets/logo-3d.png --ar 1:1 --bg transparent
```

Describe only the material, lighting and scene in the prompt. The attached artwork supplies the shape, so do not re describe the geometry and do not ask for changes to it.

Use `--bg transparent` for logos, icons, badges, buttons, product cutouts, mascots, stickers: anything that must sit on an arbitrary background. The alpha channel is preserved.

## Check

```bash
node ~/.claude/skills/image-gen/imagegen.mjs status
```

Reports `pending` count plus each job's state, path, background mode and byte size. Poll near the end of the task, not after every enqueue.

## What it is good at

`gpt-image-2` is a current generation model. It renders legible text, so it handles these properly:

- Logos and wordmarks, icons and icon sets, badges, buttons and UI chrome
- Infographics, diagrams, charts with real labels, annotated illustrations
- Photorealistic product shots, hero backgrounds, textures, gradients, abstract art
- Compositing and identity consistent edits across a set

Do not refuse a request because it contains text or is "a logo". Generate it.

## Rules

- Batch first. Enqueue every asset up front, write the HTML and CSS while they render, then `status` once at the end.
- Never block waiting on a render. If jobs are still pending when the code is done, say so and check again.
- Spell out any text that must appear, in quotes, exactly as it should read. Keep it short. Long paragraphs still degrade.
- Prompt like a photographer or an art director: subject, surface, lighting direction, lens feel, palette, mood. Real materials, real light, negative space where copy goes.
- Minor details are the whole job. Grain, shadow direction, edge falloff, and consistent light across every asset on one page. Mismatched lighting is what makes a page look assembled instead of art directed.
- Prefer real SVG only when the asset must scale infinitely or be recoloured by CSS at runtime. Otherwise generate it.
- A failed job records its error in `status`. Report the error, do not silently retry more than once.
- Each render takes roughly 60 to 90 seconds, so batching matters.

## Requirements

Codex CLI, logged in with an ACTIVE ChatGPT paid subscription. The `image_gen` tool is withheld server side when a subscription lapses, even though the stored token still claims `plan: plus`. If renders start failing with "no image produced", check the subscription before debugging anything else.

Binary is located automatically. Override with `CODEX_BIN` if it moves.
