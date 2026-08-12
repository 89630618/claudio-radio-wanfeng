import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Player exposes accessible narration mode controls in the existing transport strip", async () => {
  const player = await readFile(new URL("../components/Player.tsx", import.meta.url), "utf8");
  assert.match(player, /aria-label="Narration mode"/);
  assert.match(player, /人声起点/);
  assert.match(player, /压歌头/);
  assert.match(player, /narration-mode/);
});
