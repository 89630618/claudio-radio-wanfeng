import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("volume control exposes its current position with a visible marker", async () => {
  const stylesheet = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(stylesheet, /\.elastic-volume__track\s*\{[^}]*height:\s*3px;/);
  assert.match(stylesheet, /\.elastic-volume__fill::after\s*\{/);
  assert.match(stylesheet, /\.elastic-volume__fill::after\s*\{[^}]*width:\s*8px;/);
  assert.match(stylesheet, /\.transport-strip \.elastic-volume \.elastic-volume__input\s*\{[^}]*height:\s*30px !important;/);
});
