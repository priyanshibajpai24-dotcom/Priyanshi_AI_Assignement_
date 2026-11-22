import { AgentError } from './errors.mjs';
export function completionUrl(baseURL) {
  const url = new URL(baseURL);
  if (!url.pathname.replace(/\/$/, '').endsWith('/chat/completions')) url.pathname = url.pathname.replace(/\/$/, '') + '/chat/completions';
  url.hash = ''; return url.toString();
}
export async function requestCompletion(config, messages, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);
  try {
    const response = await fetchImpl(completionUrl(config.baseURL), {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages, response_format: { type: 'json_object' }, stream: false }),
      signal: controller.signal
    });
    if (!response.ok) {
      const code = response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_HTTP_ERROR';
      throw new AgentError(code, response.status === 429 ? 'Model provider rate limited the request.' : `Model provider returned HTTP ${response.status}.`, 3, { status: response.status });
    }
    let body;
    try { body = await response.json(); } catch { throw new AgentError('PROVIDER_INVALID_RESPONSE', 'Model provider returned a non-JSON response.', 3); }
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new AgentError('PROVIDER_INVALID_RESPONSE', 'Model provider response did not contain message content.', 3);
    if (Buffer.byteLength(content, 'utf8') > 16384) throw new AgentError('PROVIDER_INVALID_RESPONSE', 'Model provider output exceeded the 16384-byte limit.', 3);
    return content;
  } catch (error) {
    if (error instanceof AgentError) throw error;
    if (error?.name === 'AbortError') throw new AgentError('PROVIDER_TIMEOUT', 'Model provider request timed out.', 3);
    throw new AgentError('PROVIDER_NETWORK_ERROR', 'Model provider request failed before a response was received.', 3);
  } finally { clearTimeout(timer); }
}
