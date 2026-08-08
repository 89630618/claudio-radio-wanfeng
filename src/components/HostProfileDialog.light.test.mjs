import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("host profile keeps the dark chassis free of added warm lighting", async () => {
  const [dialog, stylesheet] = await Promise.all([
    readFile(new URL("./HostProfileDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(dialog, /host-profile-lamp/);
  assert.doesNotMatch(stylesheet, /host-profile-lamp/);
  const finalDialogRule = stylesheet.match(/:root\[data-theme="dark"\] \.host-profile-dialog\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.doesNotMatch(finalDialogRule, /rgba\(238, 160, 78, 0\.34\)/);
  assert.doesNotMatch(finalDialogRule, /rgba\(194, 111, 48, 0\.14\)/);
  assert.match(stylesheet, /#0b0e0c !important;/);
});
