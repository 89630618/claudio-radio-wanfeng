import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("showcase builds through its own static Vite entry", async () => {
  const [config, html, main, packageJson] = await Promise.all([
    read("../../vite.showcase.config.ts"),
    read("../../showcase/index.html"),
    read("./main.tsx"),
    read("../../package.json"),
  ]);
  assert.match(config, /base:\s*"\/claudio-radio-wanfeng\/"/);
  assert.match(config, /root:\s*resolve\(__dirname,\s*"showcase"\)/);
  assert.match(config, /dist-showcase/);
  assert.match(html, /src="\.\.\/src\/showcase\/main\.tsx"/);
  assert.doesNotMatch(main, /\.\.\/App|\.\.\/api/);
  assert.match(packageJson, /"dev:showcase":\s*"npm run build:showcase && vite preview --config vite\.showcase\.config\.ts --host 127\.0\.0\.1 --port 5176"/);
});

test("showcase keeps the existing radio layout while excluding runtime APIs", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /className="shell"/);
  assert.match(app, /<section className="stage">/);
  assert.match(app, /<ProfileCard/);
  assert.match(app, /<TopBar/);
  assert.match(app, /<Player/);
  assert.match(app, /<PlaylistQueue/);
  assert.match(app, /<AudioPlayer/);
  assert.match(app, /进入电台/);
  assert.match(app, /useNarrationPlayback/);
  assert.match(app, /stopMusicOnVoiceEnd:\s*true/);
  assert.doesNotMatch(app, /showcase-dj-line/);
  assert.doesNotMatch(app, /from\s+["']\.\.\/api["']|fetch\(|\/api\//);
  assert.doesNotMatch(app, /ChatPanel/);
});

test("showcase adds no alternate stage geometry to the shared radio layout", async () => {
  const stylesheet = await read("./showcase.css");
  assert.doesNotMatch(stylesheet, /aspect-ratio/);
  assert.doesNotMatch(stylesheet, /showcase-stage/);
  assert.doesNotMatch(stylesheet, /showcase-dj-line/);
  assert.match(stylesheet, /\.taste-controls[\s\S]*display: none/);
});
