import { invalidRequest, notFound, requestTooLarge, toApiError } from "./errors.mjs";
import { TASK_LIMITS } from "./validation.mjs";

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

function parseTaskListOptions(url) {
  const tags = url.searchParams.getAll("tag");
  const sortValues = url.searchParams.getAll("sort");
  if (sortValues.length > 1) {
    throw invalidRequest("Only one sort option may be provided.");
  }
  return { tags, sort: sortValues[0] };
}

async function parseJsonBody(request) {
  const chunks = [];
  let byteCount = 0;
  let tooLarge = false;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteCount += buffer.byteLength;
    if (byteCount > TASK_LIMITS.requestBodyMaxBytes) {
      tooLarge = true;
      chunks.length = 0;
    } else if (!tooLarge) {
      chunks.push(buffer);
    }
  }
  if (tooLarge) {
    throw requestTooLarge();
  }
  if (byteCount === 0) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.concat(chunks, byteCount).toString("utf8"));
  } catch {
    throw invalidRequest("The request body must contain valid JSON.");
  }
}

async function dispatchRequest(request, url, body, service) {
  if (url.pathname === "/tasks") {
    if (request.method === "GET") {
      return { status: 200, payload: { tasks: service.listTasks(parseTaskListOptions(url)) } };
    }
    if (request.method === "POST") {
      const task = await service.createTask(body);
      return { status: 201, payload: { task } };
    }
    throw notFound();
  }

  const statusMatch = url.pathname.match(/^\/tasks\/([^/]+)\/status$/);
  if (statusMatch) {
    if (request.method !== "PATCH") {
      throw notFound();
    }
    const [, rawId] = statusMatch;
    const task = await service.transitionTaskStatus(rawId, body);
    return { status: 200, payload: { task } };
  }

  const match = url.pathname.match(/^\/tasks\/([^/]+)$/);
  if (!match) {
    throw notFound();
  }
  const [, rawId] = match;
  if (request.method === "GET") {
    return { status: 200, payload: { task: service.getTask(rawId) } };
  }
  if (request.method === "PATCH") {
    const task = await service.updateTask(rawId, body);
    return { status: 200, payload: { task } };
  }
  if (request.method === "DELETE") {
    return { status: 200, payload: await service.deleteTask(rawId) };
  }
  throw notFound();
}

export function createRequestHandler(service) {
  return async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const body = await parseJsonBody(request);
      const result = await dispatchRequest(request, url, body, service);
      sendJson(response, result.status, result.payload);
    } catch (error) {
      const apiError = toApiError(error);
      if (!response.headersSent) {
        sendJson(response, apiError.status, {
          error: { code: apiError.code, message: apiError.message },
        });
      } else if (!response.writableEnded) {
        response.end();
      }
    }
  };
}
