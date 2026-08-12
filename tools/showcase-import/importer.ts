import type { ShowcaseTrack } from "../../src/showcase/types";

type FileHandle = FileSystemFileHandle & { createWritable(): Promise<{ write(value: Blob | string): Promise<void>; close(): Promise<void> }> };
type DirectoryHandle = FileSystemDirectoryHandle & { getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>; getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle> };
const choose = document.querySelector<HTMLButtonElement>("#choose-root")!;
const form = document.querySelector<HTMLFormElement>("#import-form")!;
const status = document.querySelector<HTMLOutputElement>("#status")!;
let root: DirectoryHandle | null = null;

async function directory(handle: DirectoryHandle, ...parts: string[]) { let current = handle; for (const part of parts) current = await current.getDirectoryHandle(part, { create: true }); return current; }
async function write(handle: DirectoryHandle, parts: string[], value: Blob | string) { const parent = await directory(handle, ...parts.slice(0, -1)); const file = await parent.getFileHandle(parts.at(-1)!, { create: true }); const writable = await file.createWritable(); await writable.write(value); await writable.close(); }
function extension(file: File, fallback: string) { return file.name.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1] ?? fallback; }
function licenses(catalog: ShowcaseTrack[]) { const lines = ["# Showcase Asset Licenses", "", "These entries apply to Showcase media only. They are not automatically covered by the repository Apache-2.0 license.", ""]; for (const track of catalog) lines.push(`## ${track.artist} - ${track.title}`, "", `- Track ID: \`${track.id}\``, `- Music: \`${track.musicSrc}\``, `- Cover: \`${track.coverSrc}\``, `- DJ audio: \`${track.djAudioSrc}\``, `- License: ${track.rights.license}`, `- Source: ${track.rights.sourceUrl}`, `- Attribution: ${track.rights.attribution}`, `- Scope: ${track.rights.scope}`, `- Verified: ${track.rights.verifiedAt}`, ""); return `${lines.join("\n").trim()}\n`; }
async function readCatalog(handle: DirectoryHandle) { try { const file = await (await (await handle.getDirectoryHandle("public")).getDirectoryHandle("showcase")).getFileHandle("catalog.json"); return JSON.parse(await (await file.getFile()).text()) as ShowcaseTrack[]; } catch { return []; } }

choose.addEventListener("click", async () => {
  const picker = (window as Window & { showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<DirectoryHandle> }).showDirectoryPicker;
  if (!picker) { status.value = "当前浏览器不支持目录写入，请使用最新版 Chrome 或 Edge"; return; }
  try { const selected = await picker({ mode: "readwrite" }); await selected.getFileHandle("package.json"); root = selected; status.value = `仓库：${selected.name}`; } catch (error) { status.value = error instanceof Error ? error.message : "未选择有效仓库"; }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!root) { status.value = "请先选择 Claudio 仓库目录"; return; }
  const data = new FormData(form); const id = String(data.get("id") ?? "").trim();
  const music = data.get("music"), cover = data.get("cover"), djAudio = data.get("djAudio");
  if (!/^[a-z0-9-]+$/.test(id) || !(music instanceof File) || !(cover instanceof File) || !(djAudio instanceof File)) { status.value = "请填写有效的 Track ID 和三份素材"; return; }
  const catalog = await readCatalog(root); const index = catalog.findIndex((track) => track.id === id);
  if (index >= 0 && !window.confirm(`曲目 ${id} 已存在，确认覆盖素材和 catalog 条目？`)) return;
  const musicName = `music.${extension(music, "wav")}`, coverName = `cover.${extension(cover, "jpg")}`, djName = `dj.${extension(djAudio, "wav")}`;
  const entry: ShowcaseTrack = { id, title: String(data.get("title") ?? "").trim(), artist: String(data.get("artist") ?? "").trim(), album: String(data.get("album") ?? "").trim(), djText: String(data.get("djText") ?? "").trim(), vocalStartMs: Number(data.get("vocalStartMs")), musicSrc: `showcase/tracks/${id}/${musicName}`, coverSrc: `showcase/tracks/${id}/${coverName}`, djAudioSrc: `showcase/tracks/${id}/${djName}`, rights: { status: "cleared", scope: "public-web-hosting", license: String(data.get("license") ?? "").trim(), sourceUrl: String(data.get("sourceUrl") ?? "").trim(), attribution: String(data.get("attribution") ?? "").trim(), verifiedAt: String(data.get("verifiedAt") ?? "").trim() } };
  const next = [...catalog]; if (index >= 0) next[index] = entry; else next.push(entry);
  try { const target = await directory(root, "public", "showcase", "tracks", id); await write(target, [musicName], music); await write(target, [coverName], cover); await write(target, [djName], djAudio); await write(root, ["public", "showcase", "catalog.json"], `${JSON.stringify(next, null, 2)}\n`); await write(root, ["ASSET-LICENSES.md"], licenses(next)); status.value = `已写入 ${id}，请运行 npm run showcase:validate`; } catch (error) { status.value = error instanceof Error ? error.message : "写入失败"; }
});
