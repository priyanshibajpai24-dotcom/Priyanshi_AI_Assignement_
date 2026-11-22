import assert from "node:assert/strict";
import test from "node:test";
import { TaskService } from "../../src/task-service.mjs";

function createService() {
  let document = { formatVersion: 1, nextId: 1, tasks: [] };
  const store = {
    snapshot() {
      return structuredClone(document);
    },
    async save(candidate) {
      document = structuredClone(candidate);
      return structuredClone(document);
    },
  };
  return new TaskService(store);
}

test("creation trims title and supplies the approved defaults", async () => {
  const service = createService();
  const task = await service.createTask({ title: "  Submit report  ", priority: "next" });
  assert.deepEqual(task, {
    id: 1,
    title: "Submit report",
    notes: "",
    priority: "next",
    status: "queued",
    tags: [],
  });
});

test("creation rejects a blank or overlong title, overlong notes, and missing priority", async () => {
  const service = createService();
  await assert.rejects(service.createTask({ title: "   ", priority: "now" }), { code: "INVALID_REQUEST" });
  await assert.rejects(service.createTask({ title: "x".repeat(121), priority: "now" }), { code: "INVALID_REQUEST" });
  await assert.rejects(service.createTask({ title: "Valid", notes: "x".repeat(2001), priority: "now" }), { code: "INVALID_REQUEST" });
  await assert.rejects(service.createTask({ title: "Valid" }), { code: "INVALID_REQUEST" });
});

test("IDs increase and are not reused after deletion, including concurrent creates", async () => {
  const service = createService();
  const first = await service.createTask({ title: "One", priority: "now" });
  await service.deleteTask(first.id);
  const [second, third] = await Promise.all([
    service.createTask({ title: "Two", priority: "later" }),
    service.createTask({ title: "Three", priority: "next" }),
  ]);
  assert.deepEqual([second.id, third.id], [2, 3]);
});

test("updates only supplied mutable fields and rejects unsupported fields", async () => {
  const service = createService();
  const created = await service.createTask({ title: "Original", notes: "Keep", priority: "later", tags: ["home"] });
  const updated = await service.updateTask(created.id, { title: "Changed" });
  assert.deepEqual(updated, { ...created, title: "Changed" });
  await assert.rejects(service.updateTask(created.id, { status: "done" }), { code: "INVALID_REQUEST" });
});

test("tag filters trim and case-fold values and require every selected tag", async () => {
  const service = createService();
  const both = await service.createTask({ title: "Both tags", priority: "later", tags: [" Home ", "Work"] });
  await service.createTask({ title: "Home only", priority: "now", tags: ["home"] });
  await service.createTask({ title: "Work only", priority: "next", tags: ["work"] });

  assert.deepEqual(service.listTasks({ tags: [" home ", "WORK"] }).map((task) => task.id), [both.id]);
  assert.deepEqual(service.listTasks({ tags: ["HOME"] }).map((task) => task.id), [both.id, 2]);
  assert.deepEqual(service.listTasks({ tags: ["missing"] }), []);
  await assert.rejects(
    service.createTask({ title: "Duplicate", priority: "now", tags: ["Home", " home "] }),
    { code: "INVALID_REQUEST" },
  );
});

test("priority ordering is now, next, later with ascending ID ties", async () => {
  const service = createService();
  const tasks = await Promise.all([
    service.createTask({ title: "Later one", priority: "later" }),
    service.createTask({ title: "Now one", priority: "now" }),
    service.createTask({ title: "Now two", priority: "now" }),
    service.createTask({ title: "Next", priority: "next" }),
    service.createTask({ title: "Later two", priority: "later" }),
  ]);
  assert.deepEqual(service.listTasks().map((task) => task.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(service.listTasks({ sort: "priority" }).map((task) => task.id), [2, 3, 4, 1, 5]);
  assert.deepEqual(tasks.map((task) => task.id), [1, 2, 3, 4, 5]);
});

test("every permitted status transition persists the target state", async () => {
  const service = createService();
  const created = await service.createTask({ title: "Lifecycle", priority: "now" });
  const transitions = ["active", "blocked", "active", "done"];
  let current = created;
  for (const status of transitions) {
    current = await service.transitionTaskStatus(current.id, { status });
    assert.equal(current.status, status);
    assert.equal(service.getTask(current.id).status, status);
  }
});

test("every prohibited status transition is rejected without changing stored state", async () => {
  const transitionPaths = {
    queued: [],
    active: ["active"],
    blocked: ["active", "blocked"],
    done: ["active", "done"],
  };
  const allowed = {
    queued: ["active"],
    active: ["blocked", "done"],
    blocked: ["active"],
    done: [],
  };
  const statuses = ["queued", "active", "blocked", "done"];

  for (const from of statuses) {
    for (const to of statuses) {
      if (allowed[from].includes(to)) {
        continue;
      }
      const service = createService();
      let task = await service.createTask({ title: "Prohibited edge", priority: "next" });
      for (const status of transitionPaths[from]) {
        task = await service.transitionTaskStatus(task.id, { status });
      }
      const before = service.getTask(task.id);
      await assert.rejects(service.transitionTaskStatus(task.id, { status: to }), {
        code: "INVALID_TRANSITION",
        status: 409,
      }, `${from} -> ${to}`);
      assert.deepEqual(service.getTask(task.id), before, `${from} -> ${to} leaves task unchanged`);
    }
  }
});

test("invalid transition status values are request errors", async () => {
  const service = createService();
  const task = await service.createTask({ title: "Invalid status", priority: "next" });
  const before = service.getTask(task.id);
  for (const input of [{}, { status: "working" }, { status: "done", title: "Extra" }]) {
    await assert.rejects(service.transitionTaskStatus(task.id, input), { code: "INVALID_REQUEST", status: 400 });
    assert.deepEqual(service.getTask(task.id), before);
  }
});
