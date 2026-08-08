import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mouse trail uses continuous meteor segments outside interactive controls", async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(new URL("./ClickSpark.tsx", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8")
  ]);

  assert.match(component, /type TrailSegment/);
  assert.match(component, /const maxTrails = 18;/);
  assert.match(component, /const trailLifetime = 280;/);
  assert.match(component, /createLinearGradient/);
  assert.match(component, /rgba\(244, 240, 231/);
  assert.match(component, /rgba\(131, 213, 166/);
  assert.match(component, /event\.pointerType !== "mouse"/);
  assert.match(component, /button, input, textarea, select/);
  assert.match(component, /contenteditable/);
  assert.match(component, /lastTrailPoint = null/);
  assert.match(component, /if \(sparks\.length \|\| trails\.length\) frame = window\.requestAnimationFrame\(draw\);/);
  assert.match(component, /if \(!frame\) frame = window\.requestAnimationFrame\(draw\);/);
  assert.match(stylesheet, /\.click-spark\s*\{[^}]*z-index:\s*50;/);
});
