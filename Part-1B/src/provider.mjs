import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AgentError } from './errors.mjs';

const outputSchemaPath = fileURLToPath(new URL('../../specs/002-natural-language-reminder-agent/contracts/agent-output.schema.json', import.meta.url));
const outputSchema = JSON.parse(fs.readFileSync(outputSchemaPath, 'utf8'));

export function completionUrl(baseURL) {
  const url = new URL(baseURL);
  if (!url.pathname.replace(/\/$/, '').endsWith('/chat/completions')) url.pathname = url.pathname.replace(/\/$/, '') + '/chat/completions';
  url.hash = ''; return url.toString();
}

export function ollamaChatUrl(baseURL) {
  const url = new URL(baseURL);
  const path = url.pathname.replace(/\/$/, '');
  if (!path.endsWith('/api/chat')) url.pathname = path.endsWith('/api') ? `${path}/chat` : `${path}/api/chat`;
  url.hash = '';
  return url.toString();
}

export async function requestCompletion(config, messages, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);
  try {
    const nativeOllama = config.provider === 'ollama';
    const compatibleOllama = config.provider === 'ollama-openai-compatible';
    const requestBody = nativeOllama
      ? { model: config.model, messages, format: outputSchema, stream: false, think: false, options: { temperature: 0 } }
      : { model: config.model, messages, response_format: { type: 'json_object' }, temperature: 0, max_tokens: 512, stream: false, ...(compatibleOllama ? { reasoning_effort: 'none' } : {}) };
    const headers = { 'content-type': 'application/json' };
    if (!nativeOllama) headers.authorization = `Bearer ${config.apiKey}`;
    const response = await fetchImpl(nativeOllama ? ollamaChatUrl(config.baseURL) : completionUrl(config.baseURL), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    if (!response.ok) {
      const code = response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_HTTP_ERROR';
      throw new AgentError(code, response.status === 429 ? 'Model provider rate limited the request.' : `Model provider returned HTTP ${response.status}.`, 3, { status: response.status });
    }
    let body;
    try { body = await response.json(); } catch { throw new AgentError('PROVIDER_INVALID_RESPONSE', 'Model provider returned a non-JSON response.', 3); }
    const content = nativeOllama ? body?.message?.content : body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new AgentError('PROVIDER_INVALID_RESPONSE', 'Model provider response did not contain message content.', 3);
    if (Buffer.byteLength(content, 'utf8') > 16384) throw new AgentError('PROVIDER_INVALID_RESPONSE', 'Model provider output exceeded the 16384-byte limit.', 3);
    return content;
  } catch (error) {
    if (error instanceof AgentError) throw error;
    if (error?.name === 'AbortError') throw new AgentError('PROVIDER_TIMEOUT', 'Model provider request timed out.', 3);
    throw new AgentError('PROVIDER_NETWORK_ERROR', 'Model provider request failed before a response was received.', 3);
  } finally { clearTimeout(timer); }
}
