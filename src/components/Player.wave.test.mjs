import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("voice wave combines local frequency detail with song-level performance energy", async () => {
  const [player, stylesheet, globalStylesheet] = await Promise.all([
    readFile(new URL("./Player.tsx", import.meta.url), "utf8"),
    readFile(new URL("./Player.transcript.css", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8")
  ]);

  assert.match(player, /analyser\.fftSize = 256;\s*analyser\.smoothingTimeConstant = 0\.56;/);
  assert.match(player, /const samples = new Uint8Array\(analyser\.frequencyBinCount\);/);
  assert.match(player, /Array\(92\)\.fill\(0\)/);
  assert.match(player, /let phraseEnergy = 0;/);
  assert.match(player, /let beatPulse = 0;/);
  assert.match(player, /const songEnergy =/);
  assert.match(player, /beatPulse = Math\.max\(beatPulse \* 0\.74, Math\.max\(0, songEnergy - previousSongEnergy\) \* 5\.5\);/);
  assert.match(player, /const performanceEnergy = phraseEnergy \* 0\.12 \+ beatPulse \* 0\.12;/);
  assert.match(player, /const spectralCeiling = Math\.floor\(samples\.length \* 0\.42\);/);
  assert.match(player, /const bandStart = Math\.floor\(2 \+ \(spectralCeiling - 2\) \* Math\.pow\(index \/ 91, 0\.74\)\);/);
  assert.match(player, /const contrastEnergy = Math\.max\(0, localEnergy - songEnergy \* 0\.3\);/);
  assert.match(player, /Math\.pow\(localEnergy \* 0\.76 \+ contrastEnergy \* 0\.38 \+ performanceEnergy, 0\.78\) \* 1\.16/);
  assert.match(player, /const localPeaks = zoneLevels\.map\(\(level, index\) => \{/);
  assert.match(player, /for \(let offset = -3; offset <= 3; offset \+= 1\)/);
  assert.match(player, /let peakHolds = Array\(92\)\.fill\(0\);/);
  assert.match(player, /const retainedPeak = Math\.max\(0, peakHolds\[index\] \* 0\.78 - localPeak\);/);
  assert.match(player, /peakHolds\[index\] = Math\.max\(localPeak, peakHolds\[index\] \* 0\.78\);/);
  assert.match(player, /const peakIntensity = 0\.58 \+ phraseEnergy \* 0\.92 \+ beatPulse \* 0\.5;/);
  assert.match(player, /const nearbyPeak = Math\.max\(localPeaks\[index - 1\] \?\? 0, localPeaks\[index \+ 1\] \?\? 0\);/);
  assert.match(player, /const shapedLevels = zoneLevels\.map\(\(level, index\) => \{/);
  assert.match(player, /const phraseLift = Math\.min\(0\.34, phraseEnergy \* 0\.52 \+ beatPulse \* 0\.16\);/);
  assert.match(player, /const expressiveLevels = shapedLevels\.map\(\(level\) => \{/);
  assert.match(player, /const projectedLevels = rawLevels\.map\(\(level, index\) => \{/);
  assert.match(player, /const lowerHarmonic = rawLevels\[Math\.floor\(index \* 0\.58\)\] \?\? level;/);
  assert.match(player, /const zoneSize = Math\.ceil\(projectedLevels\.length \/ 3\);/);
  assert.match(player, /const zoneFloor = Math\.min\(\.\.\.projectedLevels\.slice\(zoneStart, zoneEnd\)\);/);
  assert.match(player, /const zonePeak = Math\.max\(\.\.\.projectedLevels\.slice\(zoneStart, zoneEnd\)\);/);
  assert.match(player, /const zoneRange = Math\.max\(0\.025, zonePeak \* 0\.32, zonePeak - zoneFloor\);/);
  assert.match(player, /"--bar": "100%"/);
  assert.doesNotMatch(player, /voiceWaveShape/);
  assert.match(player, /level > previousLevel \? 0\.48 : 0\.18/);
  assert.doesNotMatch(player, /PIANO_KEY_COUNT/);
  assert.doesNotMatch(player, /Math\.random/);
  assert.doesNotMatch(player, /const ranges = \[/);
  assert.match(stylesheet, /\.voice-card\s*\{[\s\S]*?margin-top: 0;/);
  assert.match(stylesheet, /\.voice-wave\.active i,[\s\S]*?opacity: calc\(0\.3 \+ var\(--energy, 0\) \* 0\.62\);/);
  assert.equal(
    globalStylesheet.lastIndexOf("transform: scaleY(calc(0.18 + var(--energy, 0) * 0.82));") > globalStylesheet.lastIndexOf("/* Final voice-panel meter and lyric presentation. */"),
    true
  );
  assert.equal(
    globalStylesheet.lastIndexOf("opacity: calc(0.3 + var(--energy, 0) * 0.62);") > globalStylesheet.lastIndexOf("/* Final voice-panel meter and lyric presentation. */"),
    true
  );
});

test("voice wave measures the current song audio element", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /audioRef: RefObject<HTMLAudioElement \| null>;/);
  assert.match(source, /const audio = audioRef\.current;/);
  assert.match(source, /const isSongWaveActive = isPlaying;/);
});

test("voice wave reuses one media source across effect remounts", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /const songAudioSourceRef = useRef<MediaElementAudioSourceNode \| null>\(null\);/);
  assert.match(source, /songAudioSourceRef\.current \?\? context\.createMediaElementSource\(audio\)/);
});

test("voice wave samples only while its panel is open and music is playing", async () => {
  const source = await readFile(new URL("./Player.tsx", import.meta.url), "utf8");

  assert.match(source, /if \(!isVoicePanelOpen \|\| audio\.paused \|\| audio\.ended\) \{/);
  assert.match(source, /\}, \[audioRef, isVoicePanelOpen, isSongWaveActive\]\);/);
  assert.match(source, /time - lastFrame >= 50/);
  assert.match(source, /function handleVoicePanelOpen\(\) \{\s*void songAudioContextRef\.current\?\.resume\(\);\s*setIsVoicePanelOpen\(true\);/);
});
