import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { StorageFailure } from "./errors.mjs";
import { PRIORITIES, STATUSES, TASK_LIMITS } from "./validation.mjs";

const FORMAT_VERSION = 1;
const TASK_FIELDS = Object.freeze(["id", "title", "notes", "priority", "status", "tags"]);
const DOCUMENT_FIELDS = Object.freeze(["formatVersion", "nextId", "tasks"]);

function hasExactFields(value, expectedFields) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedFields.length &&
    expectedFields.every((field) => Object.hasOwn(value, field))
  );
}

function isValidStoredTask(task) {
  if (!hasExactFields(task, TASK_FIELDS)) {
    return false;
  }
  if (!Number.isSafeInteger(task.id) || task.id < 1) {
    return false;
  }
  if (
    typeof task.title !== "string" ||
    task.title.trim() !== task.title ||
    [...task.title].length < TASK_LIMITS.titleMin ||
    [...task.title].length > TASK_LIMITS.titleMax
  ) {
    return false;
  }
  if (typeof task.notes !== "string" || [...task.notes].length > TASK_LIMITS.notesMax) {
    return false;
  }
  if (!PRIORITIES.includes(task.priority) || !STATUSES.includes(task.status)) {
    return false;
  }
  if (!Array.isArray(task.tags) || task.tags.length > TASK_LIMITS.tagsMax) {
    return false;
  }
  const normalizedTags = new Set();
  for (const tag of task.tags) {
    if (
      typeof tag !== "string" ||
      tag.trim() !== tag ||
      [...tag].length < 1 ||
      [...tag].length > TASK_LIMITS.tagMax
    ) {
      return false;
    }
    const normalized = tag.toLowerCase();
    if (normalizedTags.has(normalized)) {
      return false;
    }
    normalizedTags.add(normalized);
  }
  return true;
}

function isValidDocument(document) {
  if (
    !hasExactFields(document, DOCUMENT_FIELDS) ||
    document.formatVersion !== FORMAT_VERSION ||
    !Number.isSafeInteger(document.nextId) ||
    document.nextId < 1 ||
    !Array.isArray(document.tasks)
  ) {
    return false;
  }
  const identifiers = new Set();
  let maximumId = 0;
  for (const task of document.tasks) {
    if (!isValidStoredTask(task) || identifiers.has(task.id)) {
      return false;
    }
    identifiers.add(task.id);
    maximumId = Math.max(maximumId, task.id);
  }
  return document.nextId > maximumId;
}

function createEmptyDocument() {
  return { formatVersion: FORMAT_VERSION, nextId: 1, tasks: [] };
}

export class JsonTaskStore {
  #filePath;
  #fileSystem;
  #document = createEmptyDocument();
  #initialized = false;

  constructor(filePath, fileSystem = { mkdir, readFile, rename, unlink, writeFile }) {
    this.#filePath = path.resolve(filePath);
    this.#fileSystem = fileSystem;
  }

  async initialize() {
    try {
      const raw = await this.#fileSystem.readFile(this.#filePath, "utf8");
      const loaded = JSON.parse(raw);
      if (!isValidDocument(loaded)) {
        throw new Error("Stored task data is invalid.");
      }
      this.#document = structuredClone(loaded);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        this.#document = createEmptyDocument();
      } else {
        throw error;
      }
    }
    this.#initialized = true;
  }

  snapshot() {
    if (!this.#initialized) {
      throw new Error("Task store is not initialized.");
    }
    return structuredClone(this.#document);
  }

  async save(candidate) {
    if (!this.#initialized) {
      throw new Error("Task store is not initialized.");
    }
    if (!isValidDocument(candidate)) {
      throw new Error("Candidate task data is invalid.");
    }

    const nextDocument = structuredClone(candidate);
    const directory = path.dirname(this.#filePath);
    const temporaryPath = path.join(
      directory,
      `.${path.basename(this.#filePath)}.${process.pid}.${randomUUID()}.tmp`,
    );
    let temporaryCreated = false;
    try {
      await this.#fileSystem.mkdir(directory, { recursive: true });
      temporaryCreated = true;
      await this.#fileSystem.writeFile(
        temporaryPath,
        `${JSON.stringify(nextDocument, null, 2)}\n`,
        { encoding: "utf8", flag: "wx", mode: 0o600 },
      );
      await this.#fileSystem.rename(temporaryPath, this.#filePath);
    } catch (error) {
      if (temporaryCreated) {
        try {
          await this.#fileSystem.unlink(temporaryPath);
        } catch (cleanupError) {
          if (!(cleanupError && typeof cleanupError === "object" && cleanupError.code === "ENOENT")) {
            error.cleanupError = cleanupError;
          }
        }
      }
      throw new StorageFailure(error);
    }

    this.#document = nextDocument;
    return this.snapshot();
  }
}
