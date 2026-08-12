import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const blocked = [
  ["/api/", /\/api\//i],
  ["localhost", /localhost/i],
  ["local absolute path", /[A-Z]:\\|\/Users\/|\/home\//i],
  ["API key field", /(?:AI|FISH|OPENAI)_(?:API_)?KEY/i],
  ["external runtime URL", /https?:\/\/(?!89630618\.github\.io)/i],
] as const;

export function scanBuildText(text: string) {
  return blocked.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)]));
  return nested.flat();
}

async function main() {
  const output = resolve(import.meta.dirname, "../../dist-showcase");
  const findings = (await Promise.all((await files(output)).map(async (file) => {
    const runtimeDocument = [".html", ".css"].includes(extname(file));
    const result = scanBuildText(await readFile(file, "utf8").catch(() => ""));
    return { file, findings: result.filter((finding) => finding !== "external runtime URL" || runtimeDocument) };
  }))).filter((entry) => entry.findings.length);
  if (findings.length) {
    for (const entry of findings) console.error(`ERROR ${entry.file}: ${entry.findings.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  console.log("Showcase build safety scan passed.");
}

if (process.argv[1]?.endsWith("scan-build.ts")) void main();
