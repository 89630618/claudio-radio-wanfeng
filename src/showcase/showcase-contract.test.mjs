import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("showcase builds through its own static Vite entry", async () => {
  const [config, html, main] = await Promise.all([
    read("../../vite.showcase.config.ts"),
    read("../../showcase/index.html"),
    read("./main.tsx"),
  ]);
  assert.match(config, /base:\s*"\/claudio-radio-wanfeng\/"/);
  assert.match(config, /root:\s*resolve\(__dirname,\s*"showcase"\)/);
  assert.match(config, /dist-showcase/);
  assert.match(html, /src="\.\.\/src\/showcase\/main\.tsx"/);
  assert.doesNotMatch(main, /\.\.\/App|\.\.\/api/);
});

test("showcase reuses the existing radio screen while excluding runtime APIs", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /className="shell showcase-shell"/);
  assert.match(app, /className="stage showcase-stage"/);
  assert.match(app, /<ProfileCard/);
  assert.match(app, /<TopBar/);
  assert.match(app, /<Player/);
  assert.match(app, /<PlaylistQueue/);
  assert.match(app, /<AudioPlayer/);
  assert.match(app, /进入电台/);
  assert.match(app, /useNarrationPlayback/);
  assert.match(app, /stopMusicOnVoiceEnd:\s*true/);
  assert.doesNotMatch(app, /from\s+["']\.\.\/api["']|fetch\(|\/api\//);
  assert.doesNotMatch(app, /ChatPanel/);
});
