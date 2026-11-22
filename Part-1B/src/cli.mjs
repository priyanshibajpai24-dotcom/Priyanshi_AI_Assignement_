import { validateRequest } from './input-validator.mjs';
import { readConfig } from './config.mjs';
import { runAgent } from './reminder-agent.mjs';
import { AgentError, errorPayload } from './errors.mjs';
function readStdin() {
  return new Promise((resolve,reject) => {
    let raw='';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data',chunk=>{raw+=chunk;});
    process.stdin.on('end',()=>resolve(raw));
    process.stdin.on('error',reject);
  });
}
let code=0;
try {
  const raw=await readStdin();
  let request;
  try { request=JSON.parse(raw); } catch { throw new AgentError('INPUT_INVALID','stdin must contain one JSON request.',2); }
  validateRequest(request);
  const config=readConfig(process.env);
  const output=await runAgent(request,config);
  process.stdout.write(JSON.stringify(output)+'\n');
} catch (error) {
  const safe=error instanceof AgentError ? error : new AgentError('INTERNAL_ERROR','The request could not be completed safely.',5);
  code=safe.exitCode ?? 5;
  process.stderr.write(JSON.stringify(errorPayload(safe))+'\n');
}
process.exitCode=code;
