# Project-level validation repair log

## 2026-11-18: Root test discovery

The first root `pnpm test` invocation used `node --test` with no file arguments. It recursively discovered archived source-generation tests under `evidence/part-1b/previous-final-generation-2026-11-13/`; several historical tests failed against their archived environment. The raw output and exit status are preserved in `2026-11-18-root-unscoped-test.stdout.txt` and `2026-11-18-root-unscoped-test.exitcode.txt`.

The first attempted repair, `node --test tests`, also failed: on Node 24 this directory argument was resolved as a module path. Its raw output and exit status are preserved in `2026-11-18-part-1a-tests.stdout.txt` and `2026-11-18-part-1a-tests.exitcode.txt`.

The root `test` script now names the two active Part 1A test files explicitly, leaving archived snapshots untouched. The repaired run passed 20/20 tests. Root lint and the deterministic Part 1A harness also exited 0; all 18 harness cases passed. Each final command's output and exit status is saved beside this log.

These two initial failures were command-discovery/configuration issues. No product specification, test assertion, harness threshold, or archived generation was changed to obtain a pass.

## 2026-11-18: Local Ollama setup

The first two signed installer runs returned exit code 5. The shell's `LOCALAPPDATA` points inside the Codex sandbox, and neither attempt created a usable Ollama executable at the expected location. The local launcher now checks the project-local `.tools/ollama/ollama.exe` and keeps Ollama model data in the ignored `.tools/ollama-models/` folder.

A third run stopped before installation because the official downloader reported an SSL connection error. A separate `curl.exe` attempt failed with Windows `CRYPT_E_REVOCATION_OFFLINE`; certificate revocation checking was not disabled. A fourth official-installer attempt was interrupted after remaining at “Installing Ollama” for over nine minutes; only the installer-created uninstaller scaffolding appeared, and no `ollama.exe` was present. The shell session returned exit 1 when interrupted. Its raw progress is in `2026-11-18-ollama-install-attempt-4.stdout.txt`.

To avoid the stalled installer, setup switched to Ollama's official standalone Windows ZIP release. The project installer script pins the release and published SHA-256, verifies the checksum before extraction, and keeps the executable and model cache under the ignored `.tools/` folder. The ZIP download and SHA-256 verification succeeded, extraction exited 0, and the standalone binary reported Ollama 0.40.14. Raw output and exit codes are preserved in the `2026-11-18-ollama-portable-*` and `2026-11-18-ollama-version.*` files.

The first manual server start then failed because Ollama tried to create its signing key under the read-only Windows user profile. Starting it with `USERPROFILE` directed to `.tools/ollama-home` succeeded and bound the service to `127.0.0.1:11434`. Part 1B's local startup script now sets that project-local profile for its Ollama subprocesses. The initial project launcher run also failed to open the browser and exited before its child services remained available; that failure is preserved in `2026-11-18-client-demo-start.*`. The launcher was revised to catch browser-open failures and remain active until Ctrl+C.

## 2026-11-21: Part 1B live-evaluation repair

The completed Qwen3.5 0.8B live run did not meet the approved evaluation thresholds. Run ID `2026-11-18T18-32-48-418Z` scored schema rate 0.222, invariant rate 0.167, one guardrail violation, mean semantic score 0.144, and minimum 0. The original dataset and thresholds were not changed. Its raw results and exit code are in `evidence/part-1b/raw/2026-11-18T18-32-48-418Z/` and `2026-11-18-part-1b-live-qwen35-08b.*`.

The first current-code Part 1B test and lint attempt failed with `EPERM` while Node tried to inspect `C:\Users\hp\AppData`. Rerunning with `TEMP` and `TMP` pointed to the project-local `.tools/tmp` directory passed 52/52 tests and ESLint; both the failed and repaired outputs and statuses are preserved in `2026-11-21-part-1b-*openai-compatible*` files.

The Qwen3.5 2B model pull completed with exit 0 and SHA-256 verification by Ollama. However, the existing Ollama 0.40.14 server returns an empty model list and reports `Access is denied` while reading the downloaded manifest. The server is not treated as ready. An attempt to fetch the newer official v0.40.16 bundle through the PowerShell TLS stack failed before download (`No credentials are available in the security package`); the downloader now uses Node's environment proxy support without disabling TLS validation. The download, SHA-256 check, extraction, model startup, and live evaluation are pending. No current Part 1B live PASS is claimed.
