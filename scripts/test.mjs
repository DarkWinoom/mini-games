import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const directory = resolve(".test-cache");
mkdirSync(directory, { recursive: true });
const output = resolve(directory, "regression.mjs");
await build({
  entryPoints: ["tests/regression.test.ts"],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": resolve("src") },
  logLevel: "silent",
});
const result = spawnSync(process.execPath, ["--test", output], {
  stdio: "inherit",
});
process.exitCode = result.status ?? 1;
