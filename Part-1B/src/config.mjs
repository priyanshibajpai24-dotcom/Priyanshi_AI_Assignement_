import { AgentError } from './errors.mjs';
export function readConfig(env = process.env) {
  const baseURL = env.AI_BASE_URL;
  const model = env.AI_MODEL;
  const provider = env.AI_PROVIDER ?? 'openai-compatible';
  const localProvider = ['ollama', 'ollama-openai-compatible'].includes(provider);
  const apiKey = env.AI_API_KEY || (localProvider ? 'ollama' : '');
  if (!['openai-compatible', 'ollama', 'ollama-openai-compatible'].includes(provider)) throw new AgentError('CONFIG_INVALID', 'AI_PROVIDER must be openai-compatible, ollama, or ollama-openai-compatible.', 3);
  if (!baseURL || !model || (!localProvider && !apiKey)) throw new AgentError('CONFIG_INVALID', 'AI_BASE_URL, AI_MODEL, and AI_API_KEY are required for openai-compatible providers.', 3);
  let url;
  try { url = new URL(baseURL); } catch { throw new AgentError('CONFIG_INVALID', 'AI_BASE_URL must be a valid HTTP(S) URL.', 3); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new AgentError('CONFIG_INVALID', 'AI_BASE_URL must be an HTTP(S) URL without embedded credentials.', 3);
  const timeout = env.AI_TIMEOUT_MS === undefined ? 30000 : Number(env.AI_TIMEOUT_MS);
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120000) throw new AgentError('CONFIG_INVALID', 'AI_TIMEOUT_MS must be an integer from 1000 through 120000.', 3);
  return Object.freeze({ provider, baseURL: url.toString(), model, apiKey, timeout });
}
export function providerMetadata(config) {
  let origin;
  try { origin = new URL(config.baseURL).origin; } catch { origin = "invalid"; }
  const provider = config.provider === 'ollama' ? 'ollama-native-chat' : config.provider === 'ollama-openai-compatible' ? 'ollama-openai-compatible-chat-completions' : 'openai-compatible-chat-completions';
  return { provider, baseUrlOrigin: origin, model: config.model, timeoutMs: config.timeout };
}
