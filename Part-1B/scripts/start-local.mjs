import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
const localTools = path.resolve(projectRoot, '..', '.tools');
env.OLLAMA_EXE ??= path.join(localTools, 'ollama-portable-v0.40.16', 'ollama.exe');
env.OLLAMA_MODELS ??= path.join(localTools, 'ollama-models');
if (process.platform === 'win32') {
  const localOllamaHome = path.join(localTools, 'ollama-home');
  fs.mkdirSync(localOllamaHome, { recursive: true });
  env.USERPROFILE = localOllamaHome;
}
env.AI_PROVIDER ??= 'ollama-openai-compatible';
env.AI_BASE_URL ??= 'http://127.0.0.1:11434/v1';
env.AI_MODEL ??= 'qwen3.5:2b';
env.AI_API_KEY ??= 'ollama';
env.AI_TIMEOUT_MS ??= '120000';

function findOllama() {
  const candidates = [
    env.OLLAMA_EXE,
    process.platform === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe') : null,
    process.platform === 'win32' && process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Ollama', 'ollama.exe') : null,
    'ollama'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate !== 'ollama' && !fs.existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

function tagsUrl(baseURL) {
  return new URL('/api/tags', baseURL).toString();
}

async function getTags(baseURL) {
  try {
    const response = await fetch(tagsUrl(baseURL), { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function ensureLocalOllama() {
  const endpoint = new URL(env.AI_BASE_URL);
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(endpoint.hostname);
  if (!loopback) return;

  const ollama = findOllama();
  if (!ollama) {
    throw new Error('Ollama is not installed. Install it once from https://ollama.com/download/windows, then rerun pnpm start:local.');
  }

  let tags = await getTags(env.AI_BASE_URL);
  if (!tags) {
    const service = spawn(ollama, ['serve'], { detached: true, stdio: 'ignore', windowsHide: true, env });
    service.unref();
    for (let attempt = 0; attempt < 45 && !tags; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      tags = await getTags(env.AI_BASE_URL);
    }
  }
  if (!tags) throw new Error('Could not reach the local Ollama service at the configured address.');

  const available = (tags.models ?? []).some(model => model.name === env.AI_MODEL || model.name?.startsWith(`${env.AI_MODEL}:`));
  if (!available) {
    process.stdout.write(`Downloading model ${env.AI_MODEL} for the first run. This may take several minutes.\n`);
    const pulled = spawnSync(ollama, ['pull', env.AI_MODEL], { cwd: projectRoot, stdio: 'inherit', windowsHide: false, env });
    if (pulled.error || pulled.status !== 0) throw new Error(`Could not download model ${env.AI_MODEL}.`);
  }
}

try {
  if (['ollama', 'ollama-openai-compatible'].includes(env.AI_PROVIDER)) await ensureLocalOllama();
  const child = spawn(process.execPath, ['src/interactive.mjs'], { cwd: projectRoot, env, stdio: 'inherit', windowsHide: false });
  child.on('error', () => {
    process.stderr.write('Could not start the reminder application.\n');
    process.exitCode = 1;
  });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
