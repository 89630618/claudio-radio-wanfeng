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
  assert.match(packageJson, /"build":\s*"tsc -b && vite build --config vite\.showcase\.config\.ts"/);
  assert.doesNotMatch(packageJson, /dev:server|dev:web|npm run smoke|server\/scripts/);
  assert.match(packageJson, /"showcase:validate":\s*"tsx scripts\/showcase\/validate-cli\.ts"/);
  assert.match(packageJson, /"showcase:release-check":\s*"npm run showcase:validate:release && npm run build:showcase && npm run showcase:scan-build"/);
});

test("showcase branch excludes the full product runtime", async () => {
  const [packageJson, app] = await Promise.all([read("../../package.json"), read("./ShowcaseApp.tsx")]);
  assert.doesNotMatch(packageJson, /express|undici|dev:server|dev:web|smoke/);
  assert.doesNotMatch(app, /fetch\(|\/api\/|KuGou|Fish|LLM/);
});

test("showcase workflows verify every release gate and keep Pages deployment manually approved", async () => {
  const [workflow, pagesWorkflow] = await Promise.all([
    read("../../.github/workflows/showcase-verify.yml"),
    read("../../.github/workflows/showcase-pages.yml"),
  ]);
  assert.match(workflow, /npx tsx --test/);
  assert.match(workflow, /npm run showcase:validate/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run showcase:scan-build/);
  assert.match(workflow, /actions\/upload-artifact/);
  assert.doesNotMatch(workflow, /deploy-pages|gh-pages|configure-pages/);
  assert.match(pagesWorkflow, /workflow_dispatch/);
  assert.match(pagesWorkflow, /actions\/checkout@v4\s+with:\s+ref:\s+showcase/);
  assert.match(pagesWorkflow, /deploy:/);
  assert.match(pagesWorkflow, /default:\s*false/);
  assert.match(pagesWorkflow, /npm run showcase:validate:release/);
  assert.match(pagesWorkflow, /npm run showcase:scan-build/);
  assert.match(pagesWorkflow, /actions\/deploy-pages/);
  assert.match(pagesWorkflow, /inputs\.deploy\s*==\s*'true'/);
});

test("showcase keeps the existing radio layout while excluding runtime APIs", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /className="shell showcase-shell"/);
  assert.match(app, /<section className="stage">/);
  assert.match(app, /<ProfileCard/);
  assert.match(app, /<TopBar/);
  assert.match(app, /<Player/);
  assert.match(app, /<PlaylistQueue/);
  assert.match(app, /<AudioPlayer/);
  assert.match(app, /进入电台/);
  assert.match(app, /useNarrationPlayback/);
  assert.match(app, /narration\.select\(\{ mode, musicSource:/);
  assert.doesNotMatch(app, /stopMusicOnVoiceEnd:\s*true/);
  assert.doesNotMatch(app, /showcase-dj-line/);
  assert.doesNotMatch(app, /from\s+["']\.\.\/api["']|fetch\(|\/api\//);
  assert.doesNotMatch(app, /ChatPanel/);
});

test("showcase keeps private actions hidden without replacing the shared radio layout", async () => {
  const stylesheet = await read("./showcase.css");
  assert.doesNotMatch(stylesheet, /showcase-dj-line/);
  assert.match(stylesheet, /\.taste-controls[\s\S]*display: none/);
  assert.doesNotMatch(stylesheet, /\.voice-panel-backdrop\s*\{\s*display:\s*none/);
});

test("showcase adds a static host message panel without conversation runtime", async () => {
  const [app, panel] = await Promise.all([read("./ShowcaseApp.tsx"), read("./ShowcaseMessagePanel.tsx")]);
  assert.match(app, /<ShowcaseMessagePanel/);
  assert.match(panel, /DJ小王子/);
  assert.match(panel, /仅供产品展示，无法和晚风对话噢/);
  assert.match(panel, /<input[^>]*disabled/);
  assert.doesNotMatch(panel, /<form|fetch\(|\/api\//);
});

test("showcase message panel shows the Nielong greeting and a disabled display input", async () => {
  const panel = await read("./ShowcaseMessagePanel.tsx");
  assert.match(panel, /user-avatar/);
  assert.match(panel, /我是奶龙/);
  assert.match(panel, /<input[^>]*disabled/);
  assert.match(panel, /仅供展示，暂不支持输入/);
});

test("showcase greetings follow the five requested day periods", async () => {
  const panel = await read("./ShowcaseMessagePanel.tsx");
  assert.match(panel, /if \(hour < 6\) return "深夜好"/);
  assert.match(panel, /if \(hour < 11\) return "早上好"/);
  assert.match(panel, /if \(hour < 13\) return "中午好"/);
  assert.match(panel, /if \(hour < 18\) return "下午好"/);
  assert.match(panel, /if \(hour < 22\) return "晚上好"/);
  assert.match(panel, /return "深夜好"/);
});

test("showcase build configuration writes a deployable HTML entry", async () => {
  const config = await read("../../vite.showcase.config.ts");
  assert.match(config, /outDir:\s*resolve\(__dirname,\s*"dist-showcase"\)/);
});

test("showcase restores the radio's host-profile and narration-panel entry paths", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /import \{ HostProfileDialog \}/);
  assert.match(app, /const \[isHostProfileOpen, setIsHostProfileOpen\] = useState\(false\)/);
  assert.match(app, /onHostProfileOpen=\{openHostProfile\}/);
  assert.match(app, /<HostProfileDialog/);
  assert.doesNotMatch(app, /onHostProfileOpen=\{\(\) => undefined\}/);
});

test("showcase waits for newly assigned music and DJ sources before playing", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /music\.addEventListener\("canplay", begin, \{ once: true \}\)/);
  assert.match(app, /voice\.addEventListener\("canplay", begin, \{ once: true \}\)/);
});

test("showcase plays local narration at its recorded speed", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.doesNotMatch(app, /voice\.playbackRate\s*=/);
});

test("vocal-start mode unlocks the DJ audio from the user's play gesture", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /const primeVoice = useCallback/);
  assert.match(app, /primeVoice\(selected\.djAudioSrc\);\s*narration\.select/);
  assert.match(app, /voice\.muted = true/);
  assert.match(app, /voice\.src = url;\s*voice\.currentTime = 0;\s*void voice\.play\(\)/);
});

test("showcase delays intro narration by three seconds and invalidates stale DJ runs", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /introDelayMs:\s*3000/);
  assert.match(app, /const voiceRunRef = useRef\(0\)/);
  assert.match(app, /const runId = \+\+voiceRunRef\.current/);
  assert.match(app, /if \(runId !== voiceRunRef\.current\) return/);
  assert.match(app, /const primeRun = \+\+voiceRunRef\.current/);
  assert.match(app, /if \(primeRun !== voiceRunRef\.current \|\| !voice\.muted\) return/);
});

test("showcase drives vocal-start narration from actual music progress", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /onTimeUpdate=\{\(time\) => \{ setCurrentTime\(time\); narration\.progress\(time \* 1000\); \}\}/);
});

test("showcase starts delayed narration through a muted browser-safe handoff", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /voice\.loop = true;[\s\S]*?voice\.muted = true;[\s\S]*?void voice\.play\(\)/);
  assert.match(app, /voice\.loop = false;[\s\S]*?voice\.currentTime = 0;[\s\S]*?voice\.muted = false/);
  assert.match(app, /voice\.loop = false; voice\.onended = null/);
});

test("showcase keeps the singer audible when vocal-start narration begins", async () => {
  const [app, types] = await Promise.all([read("./ShowcaseApp.tsx"), read("./types.ts")]);
  assert.match(app, /ducking \? 0\.72 : 1/);
  assert.match(app, /voice\.volume = modeRef\.current === "vocal_start" \? \(activeTrackRef\.current\.vocalStartDjGain \?\? 0\.4\) : 1/);
  assert.match(types, /vocalStartDjGain\?: number;/);
});

test("mobile showcase uses the safe viewport height instead of shrinking to a 9:16 inset", async () => {
  const stylesheet = await read("./showcase.css");
  assert.match(stylesheet, /padding: env\(safe-area-inset-top, 0px\) env\(safe-area-inset-right, 0px\) env\(safe-area-inset-bottom, 0px\) env\(safe-area-inset-left, 0px\)/);
  assert.match(stylesheet, /width: 100%;[\s\S]*?height: 100%;/);
});

test("desktop showcase centers a complete 9:16 radio stage", async () => {
  const stylesheet = await read("./showcase.css");

  assert.match(stylesheet, /@media \(min-width: 601px\) \{[\s\S]*?\.showcase-shell \{[\s\S]*?align-items: center;/);
  assert.match(stylesheet, /@media \(min-width: 601px\) \{[\s\S]*?\.showcase-shell \.stage \{[\s\S]*?width: min\(calc\(\(var\(--showcase-visual-height, 100dvh\) - 28px\) \* 9 \/ 16\), calc\(100vw - 32px\)\);[\s\S]*?height: min\(calc\(var\(--showcase-visual-height, 100dvh\) - 28px\), calc\(\(100vw - 32px\) \* 16 \/ 9\)\);[\s\S]*?aspect-ratio: 9 \/ 16;/);
});

test("narrow mobile keeps the radio chassis within the visual viewport", async () => {
  const [app, stylesheet] = await Promise.all([read("./ShowcaseApp.tsx"), read("../styles.css")]);

  assert.match(app, /document\.documentElement\.style\.setProperty\("--showcase-visual-height", `\$\{visualViewport\?\.height \?\? window\.innerHeight\}px`\)/);
  assert.match(stylesheet, /@media \(max-width: 420px\) \{[\s\S]*?\.showcase-shell \{[\s\S]*?overflow-x: clip;/);
  assert.match(stylesheet, /@media \(max-width: 420px\) \{[\s\S]*?\.transport-strip \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(stylesheet, /@media \(max-width: 420px\) \{[\s\S]*?\.narration-mode \{[\s\S]*?grid-column: 1 \/ -1;/);
  assert.match(stylesheet, /@media \(max-width: 600px\) \{[\s\S]*?\.voice-panel \{[\s\S]*?height: calc\(var\(--showcase-visual-height, 100dvh\) - 24px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)\);[\s\S]*?min-height: 0;/);
});

test("portrait showcase keeps volume and playback progress in separate rows", async () => {
  const stylesheet = await read("../styles.css");

  assert.match(stylesheet, /@media \(min-width: 421px\) \{[\s\S]*?@container \(max-width: 600px\) \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*?grid-template-rows: 40px auto 22px 18px;/);
  assert.match(stylesheet, /@media \(min-width: 421px\) \{[\s\S]*?\.elastic-volume \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 3;/);
  assert.match(stylesheet, /@media \(max-width: 600px\) \{[\s\S]*?\.voice-panel \{[\s\S]*?padding-bottom: max\(16px, env\(safe-area-inset-bottom, 0px\)\);/);
});

test("a finished music clip remains seekable without cancelling a still-playing narration", async () => {
  const app = await read("./ShowcaseApp.tsx");
  assert.match(app, /function handleMusicEnded\(\) \{[\s\S]*?music\.currentTime = 0;[\s\S]*?setCurrentTime\(0\);[\s\S]*?setIsPlaying\(false\);[\s\S]*?\}/);
  assert.match(app, /<AudioPlayer[\s\S]*onEnded=\{handleMusicEnded\}/);
  assert.doesNotMatch(app, /<AudioPlayer[\s\S]*onEnded=\{\(\) => narration\.cancel\(\)\}/);
});

test("shared narration mode controls use the Showcase names", async () => {
  const player = await read("../components/Player.tsx");
  assert.match(player, />人声协同<\/button>/);
  assert.match(player, />开头播放<\/button>/);
  assert.doesNotMatch(player, />人声起点<\/button>/);
  assert.doesNotMatch(player, />压歌头<\/button>/);
});

test("voice panel marks the two-second lead-in before vocal-start narration", async () => {
  const [app, player, stylesheet] = await Promise.all([
    read("./ShowcaseApp.tsx"),
    read("../components/Player.tsx"),
    read("../components/Player.transcript.css"),
  ]);
  assert.match(app, /vocalStartMs=\{track\.vocalStartMs\}/);
  assert.match(player, /vocalStartMs\?: number/);
  assert.match(player, /vocalStartMarker/);
  assert.match(player, /vocalStartMs - 2000/);
  assert.match(stylesheet, /\.vocal-start-marker/);
});

test("local catalog marks each supplied clip at its verified first vocal", async () => {
  const catalog = await read("../../public/showcase/catalog.json");
  assert.match(catalog, /"id": "local-houlai"[\s\S]*?"vocalStartMs": 12000/);
  assert.match(catalog, /"id": "local-yujian"[\s\S]*?"vocalStartMs": 25000/);
  assert.match(catalog, /"id": "local-xiaoyaotan"[\s\S]*?"vocalStartMs": 26000/);
  assert.match(catalog, /"id": "local-xingzuoshushang"[\s\S]*?"vocalStartMs": 33000/);
});

test("showcase keeps a 9:16-safe shared stage at portrait review widths", async () => {
  const stylesheet = await read("./showcase.css");
  assert.match(stylesheet, /\.showcase-shell \.stage/);
  assert.match(stylesheet, /aspect-ratio:\s*9\s*\/\s*16/);
  assert.match(stylesheet, /max-width:\s*100vw/);
});
