import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { request as rawHttpRequest } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cases } from "./cases.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const startupTimeoutMs = 8000;

function parseResponseText(text) {
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { invalidJsonResponse: text };
  }
}

function startApplication(dataFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["src/server.mjs"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: "0",
        SMART_TODO_DATA_FILE: dataFile,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      fail(new Error(`Application did not report readiness within ${startupTimeoutMs} ms.`));
    }, startupTimeoutMs);

    function finish(callback, value) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      callback(value);
    }

    function fail(error) {
      finish(reject, error);
      child.kill();
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const match = stdout.match(/LISTENING http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        finish(resolve, { child, baseUrl: `http://127.0.0.1:${match[1]}` });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => fail(new Error(`Could not spawn application: ${error.message}`)));
    child.once("exit", (code, signal) => {
      if (!settled) {
        const reason = stderr.trim() || `Application exited before readiness (code=${code}, signal=${signal}).`;
        fail(new Error(reason));
      }
    });
  });
}

async function stopApplication(instance) {
  if (!instance || instance.child.exitCode !== null || instance.child.signalCode !== null) {
    return;
  }
  await new Promise((resolve) => {
    const forceStop = setTimeout(() => instance.child.kill(), 2000);
    instance.child.once("close", () => {
      clearTimeout(forceStop);
      resolve();
    });
    instance.child.kill();
  });
}

function readJsonResponse(response) {
  return response.text().then((text) => ({
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: parseResponseText(text),
  }));
}

function sendRawRequest(baseUrl, method, pathname, body, headers = {}) {
  const target = new URL(pathname, baseUrl);
  const bodyBuffer = body === undefined ? undefined : Buffer.from(body);
  return new Promise((resolve, reject) => {
    const request = rawHttpRequest(
      {
        hostname: target.hostname,
        port: Number(target.port),
        path: `${target.pathname}${target.search}`,
        method,
        headers: {
          ...(bodyBuffer ? { "content-length": bodyBuffer.byteLength, "content-type": "application/json" } : {}),
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.once("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: parseResponseText(text),
          });
        });
      },
    );
    request.once("error", reject);
    request.end(bodyBuffer);
  });
}

function makeContext(dataFile, firstInstance) {
  let instance = firstInstance;
  return {
    dataFile,
    async request(method, pathname, body, headers = {}) {
      if (!instance) {
        throw new Error("Application is not running.");
      }
      const options = { method, headers: { ...headers } };
      if (body !== undefined) {
        options.headers["content-type"] ??= "application/json";
        options.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      return readJsonResponse(await fetch(new URL(pathname, instance.baseUrl), options));
    },
    async rawRequest(method, pathname, body, headers = {}) {
      if (!instance) {
        throw new Error("Application is not running.");
      }
      return sendRawRequest(instance.baseUrl, method, pathname, body, headers);
    },
    async stop() {
      await stopApplication(instance);
      instance = null;
    },
    async restart() {
      await stopApplication(instance);
      instance = null;
      instance = await startApplication(dataFile);
      return instance.baseUrl;
    },
  };
}

async function runCase(testCase) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "smart-todo-harness-"));
  const dataFile = path.join(directory, "tasks.json");
  let context;
  try {
    const instance = await startApplication(dataFile);
    context = makeContext(dataFile, instance);
    const details = await testCase.run(context);
    return {
      name: testCase.name,
      story: testCase.story,
      passed: true,
      ...(details && typeof details === "object" ? { details } : {}),
    };
  } catch (error) {
    return {
      name: testCase.name,
      story: testCase.story,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (context) {
      await context.stop();
    }
    await rm(directory, { recursive: true, force: true });
  }
}

const groupArgumentIndex = process.argv.indexOf("--group");
const selectedGroup = groupArgumentIndex >= 0 ? process.argv[groupArgumentIndex + 1] : undefined;
const selectedCases = selectedGroup ? cases.filter((testCase) => testCase.story === selectedGroup) : cases;
const results = [];
for (const testCase of selectedCases) {
  results.push(await runCase(testCase));
}
const failedCount = results.filter((result) => !result.passed).length;
const report = {
  selectedGroup: selectedGroup ?? "ALL",
  caseCount: results.length,
  passedCount: results.length - failedCount,
  failedCount,
  results,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failedCount > 0 || results.length === 0) {
  process.exitCode = 1;
}
