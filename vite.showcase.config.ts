import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/claudio-radio-wanfeng/",
  root: resolve(__dirname, "showcase"),
  publicDir: resolve(__dirname, "public"),
  plugins: [
    react(),
    {
      name: "showcase-local-fonts-only",
      enforce: "pre",
      transform(code, id) {
        if (!id.endsWith("src/styles.css")) return null;
        return code.replace(/^@import\s+url\([^\n]+\);\s*\n/, "");
      }
    }
  ],
  build: { outDir: resolve(__dirname, "dist-showcase"), emptyOutDir: true },
});
