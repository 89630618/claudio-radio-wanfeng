import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("chat messages use the shared entrance animation and DJ waiting copy", async () => {
  const source = await readFile(new URL("./ChatPanel.tsx", import.meta.url), "utf8");

  assert.match(source, /import \{ AnimatedContent \} from "\.\/AnimatedContent";/);
  assert.match(source, /<AnimatedContent[\s\S]*?className="chat-message-motion"/);
  assert.match(source, /一开机我就打碟ing/);
});
