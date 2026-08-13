import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: resolve(__dirname, "tools/showcase-import"),
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
});
