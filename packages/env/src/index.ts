/**
 * This module is under Node.js environment.
 * It provides a set of APIs to interact with the file system, streams, and other Node.js built-in modules.
 *
 * Use this under "node" condition,
 *
 * For example:
 * ```shell
 * node -e "const env = require('@llamaindex/env');"
 * ```
 *
 * @module
 */
import { ok } from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { EOL } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from "node:stream/web";
import type { SHA256 } from "./index.polyfill.js";
import type { CompleteFileSystem } from "./type.js";

export function createSHA256(): SHA256 {
  const hash = createHash("sha256");
  return {
    update(data: string | Uint8Array): void {
      hash.update(data);
    },
    digest() {
      return hash.digest("base64");
    },
  };
}

export const defaultFS: CompleteFileSystem = {
  writeFile: function (path: string, content: string) {
    return fs.writeFile(path, content, "utf-8");
  },
  readRawFile(path: string): Promise<Buffer> {
    return fs.readFile(path);
  },
  readFile: function (path: string) {
    return fs.readFile(path, "utf-8");
  },
  access: fs.access,
  mkdir: fs.mkdir,
  readdir: fs.readdir,
  stat: fs.stat,
};

export type * from "./type.js";
export { AsyncLocalStorage, CustomEvent, getEnv, setEnvs } from "./utils.js";
export {
  EOL,
  ReadableStream,
  TransformStream,
  WritableStream,
  ok,
  path,
  pipeline,
  randomUUID,
};
