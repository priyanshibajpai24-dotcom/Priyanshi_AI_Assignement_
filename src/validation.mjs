export const TASK_LIMITS = Object.freeze({
  titleMin: 1,
  titleMax: 120,
  notesMax: 2000,
  tagsMax: 10,
  tagMax: 32,
  requestBodyMaxBytes: 65_536,
});

export const PRIORITIES = Object.freeze(["now", "next", "later"]);
export const STATUSES = Object.freeze(["queued", "active", "blocked", "done"]);

export const MUTABLE_TASK_FIELDS = Object.freeze(["title", "notes", "priority", "tags"]);

export const STATUS_TRANSITIONS = Object.freeze({
  queued: Object.freeze(["active"]),
  active: Object.freeze(["blocked", "done"]),
  blocked: Object.freeze(["active"]),
  done: Object.freeze([]),
});
