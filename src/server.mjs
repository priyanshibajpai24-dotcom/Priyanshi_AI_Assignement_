import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JsonTaskStore } from "./json-store.mjs";
import { createRequestHandler } from "./http-api.mjs";
import { TaskService } from "./task-service.mjs";

const HOST = "127.0.0.1";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readPort(rawPort = process.env.PORT ?? "3000") {
  if (!/^\d+$/.test(rawPort)) {
    throw new Error("Invalid port configuration");
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Invalid port configuration");
  }
  return port;
}

function resolveDataFile(rawPath = process.env.SMART_TODO_DATA_FILE) {
  if (rawPath && rawPath.trim().length > 0) {
    return path.resolve(rawPath);
  }
  return path.join(PROJECT_ROOT, "data", "tasks.json");
}

export async function startServer({ port = readPort(), dataFile = resolveDataFile() } = {}) {
  const store = new JsonTaskStore(dataFile);
  await store.initialize();

  const service = new TaskService(store);
  const server = createServer(createRequestHandler(service));

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.removeListener("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, HOST);
  });

  const address = server.address();
  if (address && typeof address === "object") {
    process.stdout.write(`LISTENING http://${HOST}:${address.port}\n`);
  }
  return server;
}

async function main() {
  try {
    const server = await startServer();
    const close = () => {
      server.close(() => process.exit(0));
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch {
    process.stderr.write("Smart Todo could not start because local configuration or task storage is invalid.\n");
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath && pathToFileURL(entryPath).href === import.meta.url) {
  await main();
}
