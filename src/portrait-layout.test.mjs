import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("portrait stage uses the viewport, safe areas, and a 9:16 frame", async () => {
  const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");
  const stageRules = [...stylesheet.matchAll(/^\.stage\s*\{([^}]*)\}/gm)].map((match) => match[1]);
  const finalStageRule = stageRules.at(-1) ?? "";

  assert.match(stylesheet, /--app-viewport-height:\s*100dvh;/);
  assert.match(stylesheet, /env\(safe-area-inset-bottom\)/);
  assert.match(finalStageRule, /aspect-ratio:\s*9\s*\/\s*16;/);
  assert.match(finalStageRule, /width:\s*min\(100%,\s*calc\(/);
  assert.match(finalStageRule, /max-height:\s*calc\(var\(--app-viewport-height\)/);
});
