import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, stderr } from 'node:process';
import { readConfig } from './config.mjs';
import { runAgent } from './reminder-agent.mjs';
import { AgentError, errorPayload } from './errors.mjs';

function referenceNow() {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const absolute = Math.abs(offset);
  const localWallClock = new Date(now.getTime() + offset * 60_000).toISOString().slice(0, 19);
  return `${localWallClock}${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
stdout.write('Natural Language Reminder Agent — proposal mode\n');
stdout.write('Enter a request to draft a reminder proposal. Type /exit to quit.\n');
stdout.write('No reminder is saved or scheduled by this program.\n\n');

try {
  const config = readConfig(process.env);
  while (true) {
    const requestText = (await rl.question('Request> ')).trim();
    if (!requestText || requestText.toLowerCase() === '/exit') break;
    const request = {
      requestId: randomUUID(),
      requestText,
      context: { referenceNow: referenceNow(), timeZone, reminders: [] }
    };
    try {
      const output = await runAgent(request, config);
      stdout.write(`${JSON.stringify(output, null, 2)}\n`);
      stdout.write('Review this proposal before taking any action.\n\n');
    } catch (error) {
      const safe = error instanceof AgentError ? error : new AgentError('INTERNAL_ERROR', 'The request could not be completed safely.', 5);
      stderr.write(`${JSON.stringify(errorPayload(safe))}\n\n`);
    }
  }
} catch (error) {
  const safe = error instanceof AgentError ? error : new AgentError('INTERNAL_ERROR', 'The application could not start safely.', 5);
  stderr.write(`${JSON.stringify(errorPayload(safe))}\n`);
  process.exitCode = safe.exitCode ?? 5;
} finally {
  rl.close();
}
