import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

async function createTask(context, fields = {}) {
  return context.request("POST", "/tasks", { title: "A task", priority: "next", ...fields });
}

export const cases = [
  {
    name: "US1 create returns stable ID, queued status, and default fields",
    story: "US1",
    async run(context) {
      const response = await context.request("POST", "/tasks", { title: "  Submit report  ", priority: "next" });
      assert.equal(response.status, 201);
      assert.equal(response.headers["content-type"]?.includes("application/json"), true);
      assert.deepEqual(response.body.task, {
        id: 1,
        title: "Submit report",
        notes: "",
        priority: "next",
        status: "queued",
        tags: [],
      });
    },
  },
  {
    name: "US1 list and retrieve return stored tasks",
    story: "US1",
    async run(context) {
      const first = await createTask(context, { title: "First" });
      const second = await createTask(context, { title: "Second", priority: "later" });
      const listed = await context.request("GET", "/tasks");
      assert.equal(listed.status, 200);
      assert.deepEqual(listed.body.tasks.map((task) => task.id), [1, 2]);
      const retrieved = await context.request("GET", `/tasks/${second.body.task.id}`);
      assert.equal(retrieved.status, 200);
      assert.deepEqual(retrieved.body.task, second.body.task);
      assert.equal(first.body.task.id, 1);
    },
  },
  {
    name: "US1 empty task list returns an empty tasks array",
    story: "US1",
    async run(context) {
      const response = await context.request("GET", "/tasks");
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { tasks: [] });
    },
  },
  {
    name: "US1 partial update preserves omitted fields",
    story: "US1",
    async run(context) {
      const created = await createTask(context, { title: "Before", notes: "Keep this", priority: "later", tags: ["home"] });
      const updated = await context.request("PATCH", `/tasks/${created.body.task.id}`, { title: "After" });
      assert.equal(updated.status, 200);
      assert.deepEqual(updated.body.task, { ...created.body.task, title: "After" });
    },
  },
  {
    name: "US1 delete confirms removal and later retrieval returns not found",
    story: "US1",
    async run(context) {
      const created = await createTask(context);
      const id = created.body.task.id;
      const deleted = await context.request("DELETE", `/tasks/${id}`);
      assert.equal(deleted.status, 200);
      assert.deepEqual(deleted.body, { deleted: true, id });
      const missing = await context.request("GET", `/tasks/${id}`);
      assert.equal(missing.status, 404);
      assert.equal(missing.body.error.code, "NOT_FOUND");
    },
  },
  {
    name: "US1 unknown IDs do not change any task",
    story: "US1",
    async run(context) {
      await createTask(context, { title: "Existing" });
      for (const [method, pathname, body] of [
        ["GET", "/tasks/999", undefined],
        ["PATCH", "/tasks/999", { title: "Missing" }],
        ["DELETE", "/tasks/999", undefined],
      ]) {
        const response = await context.request(method, pathname, body);
        assert.equal(response.status, 404);
        assert.equal(response.body.error.code, "NOT_FOUND");
      }
      const listed = await context.request("GET", "/tasks");
      assert.deepEqual(listed.body.tasks.map((task) => task.title), ["Existing"]);
    },
  },
  {
    name: "US2 accepted tasks and monotonic IDs survive restart",
    story: "US2",
    async run(context) {
      const first = await createTask(context, { title: "Keep one" });
      const second = await createTask(context, { title: "Delete two", tags: ["work"] });
      const third = await createTask(context, { title: "Keep three", priority: "now" });
      await context.request("PATCH", `/tasks/${first.body.task.id}`, { notes: "Persisted notes" });
      await context.request("DELETE", `/tasks/${second.body.task.id}`);
      await context.restart();

      const listed = await context.request("GET", "/tasks");
      assert.equal(listed.status, 200);
      assert.deepEqual(listed.body.tasks, [
        { ...first.body.task, notes: "Persisted notes" },
        third.body.task,
      ]);
      const next = await createTask(context, { title: "Next ID" });
      assert.equal(next.body.task.id, 4);
    },
  },
  {
    name: "US2 malformed persisted JSON fails startup without rewriting it",
    story: "US2",
    async run(context) {
      const malformed = "{ not valid task JSON\n";
      await writeFile(context.dataFile, malformed, "utf8");
      let startupError;
      try {
        await context.restart();
      } catch (error) {
        startupError = error;
      }
      assert.ok(startupError instanceof Error);
      assert.match(startupError.message, /could not start/i);
      assert.doesNotMatch(startupError.message, /[A-Z]:\\|stack| at /i);
      assert.equal(await readFile(context.dataFile, "utf8"), malformed);
    },
  },
  {
    name: "US2 invalid request variants return 400 and preserve persisted state",
    story: "US2",
    async run(context) {
      await createTask(context, { title: "Baseline", tags: ["home"] });
      const requests = [
        ["POST", "/tasks", "{ malformed json"],
        ["POST", "/tasks", undefined],
        ["POST", "/tasks", { priority: "now" }],
        ["POST", "/tasks", { title: "   ", priority: "now" }],
        ["POST", "/tasks", { title: "x".repeat(121), priority: "now" }],
        ["POST", "/tasks", { title: "Valid", notes: "x".repeat(2001), priority: "now" }],
        ["POST", "/tasks", { title: "Valid" }],
        ["POST", "/tasks", { title: "Valid", priority: "urgent" }],
        ["POST", "/tasks", { title: "Valid", priority: "now", status: "done" }],
        ["POST", "/tasks", { title: "Valid", priority: "now", extra: true }],
        ["POST", "/tasks", { title: "Valid", priority: "now", tags: [""] }],
        ["POST", "/tasks", { title: "Valid", priority: "now", tags: ["x".repeat(33)] }],
        ["POST", "/tasks", { title: "Valid", priority: "now", tags: Array.from({ length: 11 }, (_, index) => `tag${index}`) }],
        ["POST", "/tasks", { title: "Valid", priority: "now", tags: ["Home", " home "] }],
        ["PATCH", "/tasks/1", {}],
        ["GET", "/tasks/not-an-id", undefined],
      ];
      const baseline = await context.request("GET", "/tasks");
      const persisted = await readFile(context.dataFile, "utf8");

      for (const [method, pathname, body] of requests) {
        const response = await context.request(method, pathname, body);
        assert.equal(response.status, 400, `${method} ${pathname} status`);
        assert.equal(response.body.error.code, "INVALID_REQUEST", `${method} ${pathname} error`);
        const after = await context.request("GET", "/tasks");
        assert.deepEqual(after.body, baseline.body, `${method} ${pathname} task state`);
        assert.equal(await readFile(context.dataFile, "utf8"), persisted, `${method} ${pathname} persisted file`);
      }
    },
  },
  {
    name: "US2 request bodies above 65,536 bytes return 413 for every HTTP method",
    story: "US2",
    async run(context) {
      await createTask(context, { title: "Baseline" });
      const boundaryJson = JSON.stringify({ title: "Boundary", priority: "now" });
      const exactBoundaryBody = boundaryJson + " ".repeat(65_536 - Buffer.byteLength(boundaryJson));
      const boundaryResponse = await context.rawRequest("POST", "/tasks", exactBoundaryBody);
      assert.equal(boundaryResponse.status, 201, "65,536-byte request remains within the accepted body limit");
      const baseline = await context.request("GET", "/tasks");
      const persisted = await readFile(context.dataFile, "utf8");
      const oversizedBody = "x".repeat(65_537);
      const operations = [
        ["GET", "/tasks"],
        ["POST", "/tasks"],
        ["GET", "/tasks/1"],
        ["PATCH", "/tasks/1"],
        ["DELETE", "/tasks/1"],
        ["PATCH", "/tasks/1/status"],
      ];

      for (const [method, pathname] of operations) {
        const response = await context.rawRequest(method, pathname, oversizedBody);
        assert.equal(response.status, 413, `${method} ${pathname} status`);
        assert.equal(response.body.error.code, "REQUEST_TOO_LARGE", `${method} ${pathname} error`);
        const after = await context.request("GET", "/tasks");
        assert.deepEqual(after.body, baseline.body, `${method} ${pathname} task state`);
        assert.equal(await readFile(context.dataFile, "utf8"), persisted, `${method} ${pathname} persisted file`);
      }
    },
  },
  {
    name: "US2 unknown numeric IDs return 404 and preserve every task",
    story: "US2",
    async run(context) {
      await createTask(context, { title: "Baseline" });
      const baseline = await context.request("GET", "/tasks");
      const persisted = await readFile(context.dataFile, "utf8");
      for (const [method, pathname, body] of [
        ["GET", "/tasks/999", undefined],
        ["PATCH", "/tasks/999", { title: "Missing" }],
        ["DELETE", "/tasks/999", undefined],
      ]) {
        const response = await context.request(method, pathname, body);
        assert.equal(response.status, 404, `${method} ${pathname} status`);
        assert.equal(response.body.error.code, "NOT_FOUND", `${method} ${pathname} error`);
        assert.deepEqual((await context.request("GET", "/tasks")).body, baseline.body);
        assert.equal(await readFile(context.dataFile, "utf8"), persisted);
      }
    },
  },
  {
    name: "US2 failed Windows replacement returns generic STORAGE_ERROR without losing live state",
    story: "US2",
    async run(context) {
      await createTask(context, { title: "Keep in memory" });
      const baseline = await context.request("GET", "/tasks");
      await rm(context.dataFile, { force: true });
      await mkdir(context.dataFile);

      const failedWrite = await context.request("POST", "/tasks", { title: "Cannot persist", priority: "now" });
      assert.equal(failedWrite.status, 500);
      assert.equal(failedWrite.body.error.code, "STORAGE_ERROR");
      assert.equal(failedWrite.body.error.message, "Task data could not be read or saved.");
      assert.doesNotMatch(failedWrite.body.error.message, /[A-Z]:\\|stack| at /i);
      const after = await context.request("GET", "/tasks");
      assert.deepEqual(after.body, baseline.body);
    },
  },
  {
    name: "US3 tag filters trim, ignore case, combine with AND, and allow no matches",
    story: "US3",
    async run(context) {
      const both = await createTask(context, { title: "Both", priority: "later", tags: [" Home ", "Work"] });
      const home = await createTask(context, { title: "Home", priority: "now", tags: ["home"] });
      const work = await createTask(context, { title: "Work", priority: "next", tags: ["work"] });

      const bothFilter = await context.request("GET", "/tasks?tag=%20HOME%20&tag=work");
      assert.equal(bothFilter.status, 200);
      assert.deepEqual(bothFilter.body.tasks.map((task) => task.id), [both.body.task.id]);
      const oneFilter = await context.request("GET", "/tasks?tag=WORK");
      assert.deepEqual(oneFilter.body.tasks.map((task) => task.id), [both.body.task.id, work.body.task.id]);
      const noMatches = await context.request("GET", "/tasks?tag=missing");
      assert.deepEqual(noMatches.body, { tasks: [] });
      assert.ok(home.body.task.id > 0);
    },
  },
  {
    name: "US3 listing defaults to ID order and priority sorting uses stable ID ties",
    story: "US3",
    async run(context) {
      for (const [title, priority] of [
        ["Later one", "later"],
        ["Now one", "now"],
        ["Now two", "now"],
        ["Next", "next"],
        ["Later two", "later"],
      ]) {
        await createTask(context, { title, priority });
      }
      const defaultOrder = await context.request("GET", "/tasks");
      assert.deepEqual(defaultOrder.body.tasks.map((task) => task.id), [1, 2, 3, 4, 5]);
      const priorityOrder = await context.request("GET", "/tasks?sort=priority");
      assert.deepEqual(priorityOrder.body.tasks.map((task) => task.id), [2, 3, 4, 1, 5]);
    },
  },
  {
    name: "US3 invalid filter values and sort options return INVALID_REQUEST",
    story: "US3",
    async run(context) {
      for (const pathname of ["/tasks?tag=%20%20", `/tasks?tag=${"x".repeat(33)}`, "/tasks?sort=unknown"]) {
        const response = await context.request("GET", pathname);
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, "INVALID_REQUEST");
      }
    },
  },
  {
    name: "US3 100-task filtered priority sort completes within one second",
    story: "US3",
    async run(context) {
      const expected = [];
      const priorities = ["later", "next", "now"];
      for (let index = 0; index < 100; index += 1) {
        const tags = index % 5 === 0 ? ["all", "match"] : ["all", "other"];
        const response = await createTask(context, {
          title: `Task ${index + 1}`,
          priority: priorities[index % priorities.length],
          tags,
        });
        expected.push(response.body.task);
      }
      const rank = { now: 0, next: 1, later: 2 };
      const sortedExpected = expected
        .filter((task) => task.tags.includes("match"))
        .sort((left, right) => rank[left.priority] - rank[right.priority] || left.id - right.id);
      const startedAt = performance.now();
      const response = await context.request("GET", "/tasks?tag=all&tag=match&sort=priority");
      const elapsedMs = performance.now() - startedAt;
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.tasks, sortedExpected);
      assert.ok(elapsedMs < 1000, `filtered and sorted response took ${elapsedMs.toFixed(3)} ms`);
      return { elapsedMs: Number(elapsedMs.toFixed(3)), taskCount: 100, resultCount: sortedExpected.length };
    },
  },
  {
    name: "US4 all allowed and prohibited status edges match the complete transition table",
    story: "US4",
    async run(context) {
      const statuses = ["queued", "active", "blocked", "done"];
      const allowed = {
        queued: ["active"],
        active: ["blocked", "done"],
        blocked: ["active"],
        done: [],
      };
      const transitionPaths = {
        queued: [],
        active: ["active"],
        blocked: ["active", "blocked"],
        done: ["active", "done"],
      };

      for (const from of statuses) {
        for (const to of statuses) {
          const created = await createTask(context, { title: `${from} to ${to}` });
          let expectedStatus = "queued";
          for (const status of transitionPaths[from]) {
            const advanced = await context.request("PATCH", `/tasks/${created.body.task.id}/status`, { status });
            assert.equal(advanced.status, 200, `setup transition to ${status}`);
            expectedStatus = status;
          }
          assert.equal(expectedStatus, from);
          const attempted = await context.request("PATCH", `/tasks/${created.body.task.id}/status`, { status: to });
          if (allowed[from].includes(to)) {
            assert.equal(attempted.status, 200, `${from} -> ${to} allowed status`);
            assert.equal(attempted.body.task.status, to);
          } else {
            assert.equal(attempted.status, 409, `${from} -> ${to} rejected status`);
            assert.equal(attempted.body.error.code, "INVALID_TRANSITION", `${from} -> ${to} code`);
            const unchanged = await context.request("GET", `/tasks/${created.body.task.id}`);
            assert.equal(unchanged.body.task.status, from, `${from} -> ${to} preserves source status`);
          }
        }
      }
    },
  },
  {
    name: "US4 invalid status values return 400 and an unknown task returns 404",
    story: "US4",
    async run(context) {
      const created = await createTask(context, { title: "Transition checks" });
      const baseline = await context.request("GET", "/tasks");
      for (const body of [{}, { status: "working" }, { status: "DONE" }, { status: "active", extra: true }]) {
        const response = await context.request("PATCH", `/tasks/${created.body.task.id}/status`, body);
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, "INVALID_REQUEST");
        assert.deepEqual((await context.request("GET", "/tasks")).body, baseline.body);
      }
      const missing = await context.request("PATCH", "/tasks/999/status", { status: "active" });
      assert.equal(missing.status, 404);
      assert.equal(missing.body.error.code, "NOT_FOUND");
      assert.deepEqual((await context.request("GET", "/tasks")).body, baseline.body);
    },
  },
];
