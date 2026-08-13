import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { showcaseCatalog } from "../../src/showcase/catalog";
import { validateShowcase } from "./validate";

const root = resolve(import.meta.dirname, "../..");
const release = process.argv.includes("--release");
const licensesText = await readFile(resolve(root, "ASSET-LICENSES.md"), "utf8").catch(() => "");
const errors = await validateShowcase(showcaseCatalog, {
  publicDir: resolve(root, "public"),
  licensesText,
  minTracks: release ? 5 : 1,
  rejectPlaceholder: release,
});

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Showcase catalog valid (${showcaseCatalog.length} track${showcaseCatalog.length === 1 ? "" : "s"}).`);
}
