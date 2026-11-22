# Client demo and screen recording

This demo runs on the local Windows computer. Part 1A listens only on `127.0.0.1:3000`, and Part 1B uses the local Ollama service on `127.0.0.1:11434`. It is not a public deployment and it does not send real reminders.

## One-time setup

1. Install Node.js 24 and pnpm 11.25.0.
2. Open PowerShell in this project directory and run:

   ```powershell
   pnpm client-demo
   ```

The launcher installs missing locked dependencies, downloads the official Ollama standalone runtime into `.tools/` after verifying its published SHA-256, and downloads `qwen3.5:2b` (about 2.7 GB) the first time Part 1B starts. Later runs reuse the runtime and model. Part 1B uses the local OpenAI-compatible endpoint without a hosted API key. Its model cache and signing key stay in `.tools/ollama-models` and `.tools/ollama-home`; they are excluded from evidence snapshots. Allow time and several GB of free space on the first run.

## What starts

- A Part 1A PowerShell window running the local REST API with a fresh temporary JSON database.
- Three demo tasks: “Review client brief,” “Prepare demo recording,” and “Send project summary.”
- A Part 1B PowerShell window running the natural-language reminder proposal CLI.
- A browser page showing the sorted Part 1A task JSON at `http://127.0.0.1:3000/tasks?sort=priority`.

The project has no graphical task-management page; Part 1A is an HTTP API. The browser therefore displays its JSON response. The interactive Part 1B window accepts natural-language requests and prints JSON proposals. Use a harmless example such as `Remind me tomorrow at 9 AM to review the project brief`. The exact model output can vary; show the actual output and do not describe an unsuccessful case as a passing evaluation. Type `/exit` in the reminder window to stop its prompt. Press Ctrl+C in the Part 1A window to stop its server.

## Suggested recording order

1. Start with a title card or brief spoken introduction: “BITS Assignment 1 demo: Smart Todo REST API and Natural Language Reminder Agent.”
2. Show the repository folder and `pnpm client-demo` command. Keep any personal files and account names out of view.
3. Show the Part 1A browser response and explain the seeded tasks, priority ordering, and local-only address.
4. Show the Part 1B prompt, submit a natural-language request, and describe the returned proposal or clarification. Point out that it is not scheduled.
5. Show a concise validation summary from the README or harness log. Separate deterministic/unit test results from any live-model result.
6. End by noting that this local demonstration is not a public web deployment.

Use Windows Snipping Tool's screen recording or another screen recorder already installed on the computer. Select only the application area(s) needed for the demo, close private notifications, and check the saved video before sharing. The launcher creates the Part 1A demo database under the Windows temporary directory; it is not the assignment's normal `data/tasks.json` file.

## Troubleshooting

- If port 3000 is occupied, stop the existing local process and retry.
- If the first setup is interrupted, rerun `pnpm client-demo`; it reuses downloaded files and completes setup.
- If model download fails, verify Ollama can reach its model registry and has enough disk space, then run `pnpm client-demo` again.
- If the live model returns malformed or incorrect content, retain the actual result in the appropriate evidence log. Do not relax the schema, harness thresholds, or expected outputs to make it pass.
