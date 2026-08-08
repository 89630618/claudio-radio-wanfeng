import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./db.ts", import.meta.url), "utf8");

test("KuGou sync retires missing API tracks instead of deleting history parents", () => {
  assert.match(source, /UPDATE tracks SET playable = 0 WHERE id = \? AND source = 'kugou-api'/);
  assert.doesNotMatch(source, /DELETE FROM tracks WHERE id = \? AND source = 'kugou-api'/);
});
