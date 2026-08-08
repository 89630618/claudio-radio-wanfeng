const pages = await (await fetch("http://127.0.0.1:9223/json/list")).json();
const page = pages.find((item) => item.type === "page" && item.url.includes("localhost:5173"));
if (!page) throw new Error("QA Chrome page not found");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 10_000);
    const previous = ws.onmessage;
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      clearTimeout(timer);
      ws.onmessage = previous;
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
}

await call("Page.navigate", { url: "http://localhost:5173/" });
await new Promise((resolve) => setTimeout(resolve, 3_000));

const buttons = await evaluate(`JSON.stringify([...document.querySelectorAll('button')].map(button => {
  const rect = button.getBoundingClientRect();
  return { label: button.getAttribute('aria-label'), x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}).filter(button => button.label === 'Play'))`);
const play = JSON.parse(buttons)[0];
if (!play) throw new Error("Play button not found");
console.log(JSON.stringify({ play }));

await call("Page.bringToFront");
await evaluate("document.querySelector(\"button[aria-label='Play']\")?.focus()");
await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });

await new Promise((resolve) => setTimeout(resolve, 8_000));
console.log(await evaluate(`JSON.stringify({
  audio: [...document.querySelectorAll('audio')].map(audio => ({
    src: audio.currentSrc || audio.src,
    paused: audio.paused,
    ended: audio.ended,
    currentTime: audio.currentTime,
    readyState: audio.readyState,
    error: audio.error?.message || null
  })),
  transport: document.querySelector('.transport-strip')?.className,
  copy: document.querySelector('.mini-copy')?.innerText,
  body: document.body.innerText.slice(-500),
  resources: performance.getEntriesByType('resource').filter(entry => entry.name.includes('/api/')).map(entry => ({ name: entry.name, duration: entry.duration, transferSize: entry.transferSize }))
})`));
ws.close();
