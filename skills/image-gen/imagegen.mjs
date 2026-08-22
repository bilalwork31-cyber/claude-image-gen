#!/usr/bin/env node
// Queued image generation for Claude Code, backed by the Codex built-in imagegen
// tool. Enqueue returns instantly; a detached worker renders in the background so
// the agent never blocks on a render. Uses the ChatGPT subscription, no API key.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = path.join(os.homedir(), '.claude', 'imagegen');
const QUEUE = path.join(ROOT, 'queue');
const DONE = path.join(ROOT, 'done');
const LOCK = path.join(ROOT, 'worker.lock');

const VENDOR = {
  win32: 'x86_64-pc-windows-msvc',
  darwin: process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin',
  linux: process.arch === 'arm64' ? 'aarch64-unknown-linux-musl' : 'x86_64-unknown-linux-musl',
}[process.platform];
const EXE = process.platform === 'win32' ? 'codex.exe' : 'codex';

const CODEX_CANDIDATES = [
  process.env.CODEX_BIN,
  path.join(os.homedir(), '.codex-bin', 'package', 'vendor', VENDOR || '', 'bin', EXE),
  path.join(os.homedir(), '.local', 'bin', 'codex'),
  path.join(os.homedir(), '.npm-global', 'bin', 'codex'),
  'codex',
].filter(Boolean);

function codexBin() {
  for (const c of CODEX_CANDIDATES) {
    if (c === 'codex' || fs.existsSync(c)) return c;
  }
  throw new Error('Codex CLI not found. Set CODEX_BIN to its full path.');
}

function ensureDirs() { for (const d of [ROOT, QUEUE, DONE]) fs.mkdirSync(d, { recursive: true }); }

// PNG IHDR colour type: 4 is greyscale+alpha, 6 is RGBA.
function hasAlpha(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(26);
  fs.readSync(fd, head, 0, 26, 0);
  fs.closeSync(fd);
  if (head.subarray(1, 4).toString() !== 'PNG') return false;
  return head[25] === 6 || head[25] === 4;
}

function render(job) {
  const bgLine =
    job.bg === 'transparent'
      ? 'This is a TRANSPARENT BACKGROUND request. Ask the built-in image_gen tool for a transparent background and preserve the generated alpha. The saved PNG must be RGBA, never flattened onto a solid colour.\n'
      : job.bg === 'opaque'
        ? 'Background: opaque.\n'
        : '';
  const prompt =
    `Use the imagegen skill to generate exactly one image.\n` +
    `Subject: ${job.prompt}\n` +
    `Aspect ratio: ${job.aspect}. Quality: ${job.quality}.\n` +
    bgLine +
    `Copy the finished image to this exact path, overwriting if present: ${job.out}\n` +
    `Do not write any code and do not use the CLI fallback. Reply with only the final path.`;

  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  const res = spawnSync(codexBin(), ['exec', '--dangerously-bypass-approvals-and-sandbox', prompt], {
    cwd: path.dirname(job.out),
    encoding: 'utf8',
    timeout: 15 * 60 * 1000,
    windowsHide: true,
  });
  if (res.error) throw new Error(res.error.message);
  if (!fs.existsSync(job.out)) {
    const tail = String(res.stdout || res.stderr || '').trim().slice(-400);
    throw new Error(`no image produced: ${tail}`);
  }
  if (job.bg === 'transparent' && !hasAlpha(job.out)) {
    throw new Error('transparent background requested but the PNG has no alpha channel');
  }
  return fs.statSync(job.out).size;
}

async function worker() {
  ensureDirs();
  try { fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' }); } catch { return; }
  try {
    for (;;) {
      const pending = fs.readdirSync(QUEUE).filter(f => f.endsWith('.json')).sort();
      if (!pending.length) break;
      for (const f of pending) {
        const src = path.join(QUEUE, f);
        const job = JSON.parse(fs.readFileSync(src, 'utf8'));
        try {
          job.bytes = render(job);
          job.state = 'done';
        } catch (e) {
          job.state = 'failed';
          job.error = String(e.message);
        }
        job.finished = new Date().toISOString();
        fs.writeFileSync(path.join(DONE, f), JSON.stringify(job, null, 2));
        fs.unlinkSync(src);
      }
    }
  } finally { fs.rmSync(LOCK, { force: true }); }
}

function enqueue(args) {
  ensureDirs();
  const prompt = args._.join(' ').trim();
  if (!prompt) throw new Error('Prompt required.');
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const job = {
    id,
    prompt,
    out: path.resolve(args.out || path.join(process.cwd(), 'assets', `${id}.png`)),
    aspect: args.ar || '16:9',
    quality: args.quality || 'high',
    bg: args.bg || 'auto',
    state: 'queued',
    queued: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(QUEUE, `${id}.json`), JSON.stringify(job, null, 2));
  if (!fs.existsSync(LOCK)) {
    spawn(process.execPath, [import.meta.filename, 'worker'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
  console.log(JSON.stringify({ id, out: job.out, state: 'queued' }));
}

function status(args) {
  ensureDirs();
  const one = args._[0];
  const read = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const all = [
    ...fs.readdirSync(QUEUE).filter(f => f.endsWith('.json')).map(f => read(QUEUE, f)),
    ...fs.readdirSync(DONE).filter(f => f.endsWith('.json')).map(f => read(DONE, f)),
  ].sort((a, b) => a.queued.localeCompare(b.queued));
  const rows = one ? all.filter(j => j.id === one) : all;
  const pending = all.filter(j => j.state === 'queued').length;
  console.log(JSON.stringify({ pending, jobs: rows.map(j => ({ id: j.id, state: j.state, out: j.out, bytes: j.bytes, bg: j.bg, error: j.error })) }, null, 2));
}

function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
const args = parse(rest);
try {
  if (cmd === 'generate') enqueue(args);
  else if (cmd === 'status') status(args);
  else if (cmd === 'worker') await worker();
  else {
    console.log('Usage:\n  imagegen.mjs generate "<prompt>" [--out PATH] [--ar 16:9] [--quality low|medium|high] [--bg auto|transparent|opaque]\n  imagegen.mjs status [id]');
    process.exit(1);
  }
} catch (e) { console.error(String(e.message)); process.exit(1); }
