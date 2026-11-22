import { invalidRequest, invalidTransition, notFound } from "./errors.mjs";
import {
  MUTABLE_TASK_FIELDS,
  PRIORITIES,
  STATUSES,
  STATUS_TRANSITIONS,
  TASK_LIMITS,
} from "./validation.mjs";

function requireRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function characterCount(value) {
  return [...value].length;
}

function normalizeTitle(value) {
  if (typeof value !== "string") {
    throw invalidRequest("Title must be a string.");
  }
  const title = value.trim();
  const length = characterCount(title);
  if (length < TASK_LIMITS.titleMin || length > TASK_LIMITS.titleMax) {
    throw invalidRequest("Title must contain between 1 and 120 characters after trimming.");
  }
  return title;
}

function validateNotes(value) {
  if (typeof value !== "string" || characterCount(value) > TASK_LIMITS.notesMax) {
    throw invalidRequest("Notes must be a string of at most 2,000 characters.");
  }
  return value;
}

function normalizeTags(value) {
  if (!Array.isArray(value) || value.length > TASK_LIMITS.tagsMax) {
    throw invalidRequest("Tags must be an array containing at most 10 values.");
  }
  const normalized = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string") {
      throw invalidRequest("Every tag must be a string.");
    }
    const tag = item.trim();
    if (characterCount(tag) < 1 || characterCount(tag) > TASK_LIMITS.tagMax) {
      throw invalidRequest("Each tag must contain between 1 and 32 characters after trimming.");
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      throw invalidRequest("Duplicate tags are not allowed.");
    }
    seen.add(key);
    normalized.push(tag);
  }
  return normalized;
}

function validatePriority(value) {
  if (!PRIORITIES.includes(value)) {
    throw invalidRequest("Priority must be now, next, or later.");
  }
  return value;
}

function validateFields(input, { update = false } = {}) {
  if (!requireRecord(input)) {
    throw invalidRequest("The task body must be a JSON object.");
  }
  const allowed = new Set(MUTABLE_TASK_FIELDS);
  for (const field of Object.keys(input)) {
    if (!allowed.has(field)) {
      throw invalidRequest("The task body contains an unsupported field.");
    }
  }
  if (update && Object.keys(input).length === 0) {
    throw invalidRequest("At least one mutable field must be provided.");
  }
  if (!update && (!Object.hasOwn(input, "title") || !Object.hasOwn(input, "priority"))) {
    throw invalidRequest("Title and priority are required.");
  }
  const normalized = {};
  if (Object.hasOwn(input, "title")) {
    normalized.title = normalizeTitle(input.title);
  }
  if (Object.hasOwn(input, "notes")) {
    normalized.notes = validateNotes(input.notes);
  }
  if (Object.hasOwn(input, "priority")) {
    normalized.priority = validatePriority(input.priority);
  }
  if (Object.hasOwn(input, "tags")) {
    normalized.tags = normalizeTags(input.tags);
  }
  return normalized;
}

function normalizeId(value) {
  if (typeof value === "string" && !/^[1-9]\d*$/.test(value)) {
    throw invalidRequest("Task ID must be a positive integer.");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw invalidRequest("Task ID must be a positive integer.");
  }
  return id;
}

export class TaskService {
  #store;
  #writeTail = Promise.resolve();

  constructor(store) {
    this.#store = store;
  }

  #serializeMutation(operation) {
    const result = this.#writeTail.then(operation);
    this.#writeTail = result.catch(() => undefined);
    return result;
  }

  async createTask(input) {
    const fields = validateFields(input);
    return this.#serializeMutation(async () => {
      const current = this.#store.snapshot();
      const id = current.nextId;
      if (!Number.isSafeInteger(id + 1)) {
        throw new Error("Task ID space is exhausted.");
      }
      const task = {
        id,
        title: fields.title,
        notes: fields.notes ?? "",
        priority: fields.priority,
        status: "queued",
        tags: fields.tags ?? [],
      };
      const candidate = {
        ...current,
        nextId: id + 1,
        tasks: [...current.tasks, task],
      };
      await this.#store.save(candidate);
      return structuredClone(task);
    });
  }

  listTasks({ tags = [], sort } = {}) {
    if (!Array.isArray(tags)) {
      throw invalidRequest("Tag filters must be repeated tag values.");
    }
    const normalizedTags = tags.map((tag) => {
      if (typeof tag !== "string") {
        throw invalidRequest("Each tag filter must be a string.");
      }
      const normalized = tag.trim();
      if (characterCount(normalized) < 1 || characterCount(normalized) > TASK_LIMITS.tagMax) {
        throw invalidRequest("Each tag filter must contain between 1 and 32 characters after trimming.");
      }
      return normalized.toLowerCase();
    });
    if (sort !== undefined && sort !== "priority") {
      throw invalidRequest("The only supported sort order is priority.");
    }

    const priorityRank = { now: 0, next: 1, later: 2 };
    return this.#store.snapshot().tasks
      .filter((task) => normalizedTags.every((filter) => task.tags.some((tag) => tag.toLowerCase() === filter)))
      .slice()
      .sort((left, right) => {
        if (sort === "priority") {
          const rankDifference = priorityRank[left.priority] - priorityRank[right.priority];
          if (rankDifference !== 0) {
            return rankDifference;
          }
        }
        return left.id - right.id;
      })
      .map((task) => structuredClone(task));
  }

  getTask(rawId) {
    const id = normalizeId(rawId);
    const task = this.#store.snapshot().tasks.find((candidate) => candidate.id === id);
    if (!task) {
      throw notFound();
    }
    return structuredClone(task);
  }

  async updateTask(rawId, input) {
    const id = normalizeId(rawId);
    const fields = validateFields(input, { update: true });
    return this.#serializeMutation(async () => {
      const current = this.#store.snapshot();
      const index = current.tasks.findIndex((candidate) => candidate.id === id);
      if (index < 0) {
        throw notFound();
      }
      const updated = { ...current.tasks[index], ...fields };
      const tasks = current.tasks.slice();
      tasks[index] = updated;
      await this.#store.save({ ...current, tasks });
      return structuredClone(updated);
    });
  }

  async deleteTask(rawId) {
    const id = normalizeId(rawId);
    return this.#serializeMutation(async () => {
      const current = this.#store.snapshot();
      const tasks = current.tasks.filter((task) => task.id !== id);
      if (tasks.length === current.tasks.length) {
        throw notFound();
      }
      await this.#store.save({ ...current, tasks });
      return { deleted: true, id };
    });
  }

  async transitionTaskStatus(rawId, input) {
    const id = normalizeId(rawId);
    if (
      !requireRecord(input) ||
      Object.keys(input).length !== 1 ||
      !Object.hasOwn(input, "status") ||
      !STATUSES.includes(input.status)
    ) {
      throw invalidRequest("The status body must contain only a valid status value.");
    }

    return this.#serializeMutation(async () => {
      const current = this.#store.snapshot();
      const index = current.tasks.findIndex((task) => task.id === id);
      if (index < 0) {
        throw notFound();
      }
      const task = current.tasks[index];
      if (!STATUS_TRANSITIONS[task.status].includes(input.status)) {
        throw invalidTransition();
      }
      const updated = { ...task, status: input.status };
      const tasks = current.tasks.slice();
      tasks[index] = updated;
      await this.#store.save({ ...current, tasks });
      return structuredClone(updated);
    });
  }
}
