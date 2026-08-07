#!/usr/bin/env node
// Removes generated build output without adding a cleanup dependency.
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

for (const target of ["dist", "coverage"]) {
  rmSync(join(root, target), { recursive: true, force: true });
}
