import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createTemporaryDataDirectory(prefix = "smart-todo-") {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeTemporaryDataDirectory(directory) {
  await rm(directory, { recursive: true, force: true });
}

export async function withTemporaryDataDirectory(callback) {
  const directory = await createTemporaryDataDirectory();
  try {
    return await callback(directory);
  } finally {
    await removeTemporaryDataDirectory(directory);
  }
}
