import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("remote streams fall back to a browser-playable MIME type", async () => {
  const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

  assert.match(source, /remoteContentType\?\.startsWith\("audio\/"\) \? remoteContentType : "audio\/mpeg"/);
});
