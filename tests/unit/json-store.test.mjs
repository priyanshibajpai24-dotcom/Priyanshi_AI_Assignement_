import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile, writeFile } from "node:fs/promises";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { JsonTaskStore } from "../../src/json-store.mjs";
import { StorageFailure } from "../../src/errors.mjs";
import { withTemporaryDataDirectory } from "../helpers/temp-data.mjs";

function task(id, overrides = {}) {
  return {
    id,
    title: `Task ${id}`,
    notes: "",
    priority: "next",
    status: "queued",
    tags: [],
    ...overrides,
  };
}

test("a missing file initializes the empty versioned document", async () => {
  await withTemporaryDataDirectory(async (directory) => {
    const filePath = path.join(directory, "tasks.json");
    const store = new JsonTaskStore(filePath);
    await store.initialize();
    assert.deepEqual(store.snapshot(), { formatVersion: 1, nextId: 1, tasks: [] });
  });
});

test("startup rejects unsupported or malformed persisted documents", async (t) => {
  const invalidDocuments = [
    ["unsupported version", { formatVersion: 2, nextId: 1, tasks: [] }],
    ["unknown envelope field", { formatVersion: 1, nextId: 1, tasks: [], extra: true }],
    ["non-monotonic nextId", { formatVersion: 1, nextId: 2, tasks: [task(2)] }],
    ["duplicate task IDs", { formatVersion: 1, nextId: 3, tasks: [task(1), task(1)] }],
    ["invalid task fields", { formatVersion: 1, nextId: 2, tasks: [{ ...task(1), status: "unknown" }] }],
    ["untrimmed stored title", { formatVersion: 1, nextId: 2, tasks: [task(1, { title: " Task 1 " })] }],
    ["duplicate normalized tags", { formatVersion: 1, nextId: 2, tasks: [task(1, { tags: ["Home", " home "] })] }],
  ];

  for (const [name, document] of invalidDocuments) {
    await t.test(name, async () => {
      await withTemporaryDataDirectory(async (directory) => {
        const filePath = path.join(directory, "tasks.json");
        const original = `${JSON.stringify(document)}\n`;
        await writeFile(filePath, original, "utf8");
        const store = new JsonTaskStore(filePath);
        await assert.rejects(store.initialize());
        assert.equal(await readFile(filePath, "utf8"), original);
      });
    });
  }
});

test("replacing a document persists it and a new store restores the same IDs", async () => {
  await withTemporaryDataDirectory(async (directory) => {
    const filePath = path.join(directory, "tasks.json");
    const store = new JsonTaskStore(filePath);
    await store.initialize();
    const document = { formatVersion: 1, nextId: 2, tasks: [task(1)] };
    await store.save(document);
    const restored = new JsonTaskStore(filePath);
    await restored.initialize();
    assert.deepEqual(restored.snapshot(), document);
  });
});

test("a failed atomic replacement preserves the prior file and in-memory snapshot", async () => {
  await withTemporaryDataDirectory(async (directory) => {
    const filePath = path.join(directory, "tasks.json");
    const initial = { formatVersion: 1, nextId: 2, tasks: [task(1)] };
    const original = `${JSON.stringify(initial, null, 2)}\n`;
    await writeFile(filePath, original, "utf8");
    const failingFileSystem = {
      ...fileSystem,
      async rename() {
        throw Object.assign(new Error("Injected replacement failure with private path"), { code: "EIO" });
      },
    };
    const store = new JsonTaskStore(filePath, failingFileSystem);
    await store.initialize();
    const before = store.snapshot();
    const candidate = { formatVersion: 1, nextId: 3, tasks: [...initial.tasks, task(2)] };

    await assert.rejects(store.save(candidate), (error) => error instanceof StorageFailure);
    assert.equal(await readFile(filePath, "utf8"), original);
    assert.deepEqual(store.snapshot(), before);
    assert.deepEqual(await readdir(directory), ["tasks.json"]);
  });
});
