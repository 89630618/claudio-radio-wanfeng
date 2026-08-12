import assert from "node:assert/strict";
import test from "node:test";
import { scanBuildText } from "./scan-build";

test("rejects private runtime references from Showcase output", () => {
  const findings = scanBuildText('fetch("/api/radio"); const key = "AI_API_KEY";');
  assert.deepEqual(findings, ["/api/", "API key field"]);
});

test("allows only relative static references in Showcase output", () => {
  assert.deepEqual(scanBuildText('assets/index.js showcase/tracks/demo-signal/music.wav'), []);
});
