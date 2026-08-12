import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local importer only writes through a user-selected repository directory", async () => {
  const [config, html, source] = await Promise.all([
    readFile(new URL("../../vite.import.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../../tools/showcase-import/index.html", import.meta.url), "utf8"),
    readFile(new URL("../../tools/showcase-import/importer.ts", import.meta.url), "utf8"),
  ]);
  assert.match(config, /host:\s*"127\.0\.0\.1"/);
  assert.match(config, /port:\s*4174/);
  assert.match(html, /素材导入/);
  assert.match(source, /showDirectoryPicker/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /public["']?,\s*["']showcase["']?,\s*["']tracks/);
  assert.match(source, /catalog\.json/);
  assert.match(source, /ASSET-LICENSES\.md/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket/);
});
