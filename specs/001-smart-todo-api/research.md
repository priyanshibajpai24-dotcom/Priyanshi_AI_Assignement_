# Research: Smart Todo Local Service

**Date**: 2026-11-13
**Feature**: [Smart Todo Local Service](./spec.md)

## Decision: Node.js built-in HTTP and filesystem modules

**Decision**: Use `node:http` for the local API and `node:fs/promises` for JSON persistence. Bind explicitly to `127.0.0.1`. Count request bytes as streamed chunks arrive; `Content-Length` alone is not sufficient to enforce a 65,536-byte maximum. Serialize writes because Node documents that concurrent filesystem modifications are not synchronized or thread-safe. Write a complete candidate document to a same-directory temporary file before replacing the configured data file.

**Rationale**: The Node 24 runtime is already available. Built-in APIs avoid a framework/runtime dependency and expose the stream, socket, and file behavior needed by the contract.

**Alternatives considered**: A web framework and a database. Both add dependencies and operations outside the assignment's local JSON-file scope.

**Constraint**: The official Node documentation does not promise cross-platform atomicity for every replacement scenario. Exercise target-Windows rename/replace behavior, including failure paths, before claiming the specification's preservation guarantee. Stop for design review if it cannot be met; do not weaken the requirement.

**Sources**: [Node.js v24 HTTP API](https://nodejs.org/docs/latest-v24.x/api/http.html), [Node.js v24 filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html).

## Decision: built-in Node test runner plus a separate black-box harness

**Decision**: Use `node:test` for focused unit tests and a separate deterministic harness that starts the app as a child process and uses only HTTP requests plus an isolated temporary data path. Use the built-in `fetch`/assertion APIs; do not import application modules from the harness. Run both test layers without third-party test dependencies.

**Rationale**: This preserves a genuinely independent HTTP boundary while keeping repeatable test execution local and simple.

**Alternatives considered**: A test framework that imports application internals for all checks. This would not satisfy the harness independence principle.

**Sources**: [Node.js v24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html), [Node.js v24 HTTP API](https://nodejs.org/docs/latest-v24.x/api/http.html).

## Decision: ESLint flat configuration

**Decision**: Use ESLint 10.14.0 with `@eslint/js` 10.0.1, pinned in the pnpm lockfile, using a root `eslint.config.mjs`, explicit JavaScript file patterns, Node globals, and recommended rules. Run the local CLI through a package script such as `pnpm lint`.

**Rationale**: Flat config is ESLint's current format. Explicit file and global configuration avoids browser assumptions and broad accidental linting of generated evidence.

**Alternatives considered**: Legacy `.eslintrc` configuration (no longer supported by ESLint 10) and adding TypeScript/configuration complexity for a JavaScript-only project.

**Sources**: [ESLint configuration files](https://eslint.org/docs/latest/use/configure/configuration-files), [ESLint migration guide](https://eslint.org/docs/latest/use/configure/migration-guide), [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface).

## Decision: Semgrep Community Edition for local SAST

**Decision**: Use Semgrep Community Edition 1.185.0 with an explicit JavaScript ruleset and local `semgrep scan`. Capture JSON and separately count findings; exit code zero by itself does not establish a clean scan. Avoid `--config=auto`, credentials, login, and platform upload. Pin the CLI and record the selected ruleset/revision with evidence.

**Rationale**: The Community Edition supports local scans without an account. PyPI lists a Windows x86-64 wheel for 1.185.0. A separate SAST tool gives the assignment a static-analysis result distinct from lint and tests.

**Alternatives considered**: Treating lint or dependency audit as SAST. Those checks do not replace code-pattern static analysis. The authenticated platform/Pro scan is unnecessary for a local student assignment.

**Limitations and validation**: Semgrep documentation labels Windows support beta in its current quickstart, so installation and the pinned scan must be tested on this target machine. Registry rules require fetching the ruleset; use only explicit rules and record rule identity. Community Edition has narrower analysis coverage than the paid platform, so report its scope accurately and do not describe it as a complete security proof.

**Sources**: [Semgrep Community Edition](https://semgrep.dev/products/community-edition/), [Semgrep local rules and rulesets](https://semgrep.dev/docs/running-rules), [Semgrep CLI reference](https://semgrep.dev/docs/cli-reference), [Semgrep quickstart](https://semgrep.dev/docs/getting-started/quickstart), [Semgrep CE comparison](https://semgrep.dev/products/semgrep-vs-ce/), [Semgrep 1.185.0 on PyPI](https://pypi.org/project/semgrep/1.185.0/).

## Decision: local-only package and validation workflow

**Decision**: Use Node 24 and pnpm 11.25.0 available on the user's computer. Keep runtime dependencies empty. Install only the pinned lint dependencies through pnpm; run pinned Semgrep through the available `uv` tool. Keep every command offline from application services except local `127.0.0.1` harness traffic.

**Rationale**: At planning time the user asked to keep the project in the folder without GitHub, so that instruction was followed. On 2026-11-15 the user explicitly authorized publishing both assignment parts to the named repository. The publication target changed; local reproducibility and loopback-only app behavior remain.

**Alternatives considered**: GitHub Actions and hosted application services were not needed for local development. The user later authorized a public repository for the source and evidence; no application service or workflow is added.

**Sources**: Local environment discovery on 2026-11-13 reported Node 24.22.1 and pnpm 11.25.0; no application code or scan has run yet.
