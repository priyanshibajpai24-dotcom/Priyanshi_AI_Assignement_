import { AgentError } from './errors.mjs';
import { buildMessages } from './prompt-builder.mjs';
import { requestCompletion } from './provider.mjs';
import { validateAgentOutput } from './output-validator.mjs';
import { enforceAgentInvariants } from './invariants.mjs';
export async function runAgent(request, config, provider = requestCompletion) {
  const text = await provider(config, buildMessages(request));
  let output;
  try { output = JSON.parse(text); } catch { throw new AgentError('MODEL_JSON_INVALID', 'Model response was not a JSON object.', 4); }
  validateAgentOutput(output);
  enforceAgentInvariants(request, output);
  return output;
}
