# Claudio Showcase 本地 Codex 操作手册

这份手册给个人电脑上的 Codex 使用。目标分支是 `showcase`，页面继续沿用 Claudio 电台现有界面，不要另做一套前端。

## 1. 获取项目

已有本地仓库时：

```powershell
git fetch origin
git switch showcase
git pull --ff-only origin showcase
npm ci
```

首次获取时：

```powershell
git clone --branch showcase https://github.com/89630618/claudio-radio-wanfeng.git
cd claudio-radio-wanfeng
npm ci
```

只在这个分支工作。不要把 Showcase 的静态素材、页面入口或 Pages 工作流合并到 `main`，除非明确决定改变完整产品。

## 2. 本地运行和录制

```powershell
npm run dev:showcase
```

打开：`http://127.0.0.1:5176/claudio-radio-wanfeng/`

第一次进入点击“进入电台”解锁音频。手机录制优先使用 Chrome；微信内可以查看，但 WebView 的地址栏、安全区、后台音频焦点和缓存行为不完全可控。若微信内出现裁切，先选择“在浏览器打开”。

电脑端现在会将完整 Claudio 电台舞台按 9:16 居中显示，窗口剩余区域只是环境背景。视频拍摄可直接录制这个舞台；这不会修改线上页面。

## 3. 新增、替换或删除歌曲

只使用已经准备好的歌曲片段、封面和 DJ 音频。导入器只写当前电脑上的仓库，不上传文件：

```powershell
npm run showcase:import
```

导入时填写：曲目 ID、标题、歌手、专辑、串词、`vocalStartMs`、来源和署名。覆盖旧曲目前必须确认。导入后检查：

```powershell
npm run showcase:validate:release
npx tsx --test
npm run build
npm run showcase:scan-build
```

手工试听两种模式：

- `人声协同`：歌曲从 0 秒开始，实际到 `vocalStartMs` 才开始 DJ 串词。
- `开头播放`：歌曲开始后等待约 3 秒，再开始 DJ 串词。

切歌时旧串词必须立即停止；串词结束后歌曲继续按照自己的进度播放。串词页中，只有串词正文滚动，歌曲进度条保持在弹层底部。

删除歌曲时同时删除 `public/showcase/tracks/<track-id>/`、`public/showcase/catalog.json` 中对应条目和 `ASSET-LICENSES.md` 中对应记录，然后重新运行上述验证。

## 4. 提交和上线

推荐小步提交：

```powershell
git status
git add src public scripts docs README.md ASSET-LICENSES.md
git commit -m "feat(showcase): add <track>"
git push origin showcase
```

代码推送不会自动改变 Pages。确认本地试听、测试和素材检查都通过后，在 GitHub Actions 手动运行 `Prepare or deploy Claudio Showcase`，选择 `main` 工作流引用，并把 `deploy` 设置为 `true`。工作流会固定打包 `showcase` 分支。

线上地址：<https://89630618.github.io/claudio-radio-wanfeng/>

线上更新后，手机需要重新加载页面；首次播放仍需点击“进入电台”。

## 5. 网络和使用边界

- GitHub Pages 是公网静态站点，访问需要设备能连接 `github.io`；某些手机浏览器或网络会直接显示“网页无法访问”，这是网络/DNS/运营商限制，不是播放器代码错误。
- 无 VPN 的网络无法保证 GitHub Pages 可用。可行替代是使用能访问 GitHub Pages 的浏览器/网络，或将同一个 `dist-showcase` 静态目录部署到用户可访问的静态托管域名；这属于另一个部署目标，不能在本手册中自动切换。
- Showcase 不提供聊天、LLM、Fish、KuGou、账号、上传后台或 API。所有串词和音频都是预生成静态文件。
- 当前内容是产品展示用的歌曲片段，不是完整录音，也不用于商业发行、销售或独立音乐分发。新增内容发布前仍需由项目负责人确认来源和发布范围。

## 6. Codex 接手时先做什么

让 Codex 先读取 `AGENTS.md`、本手册和 `docs/agent-handoff.md`，再执行：

```powershell
git status
git log -1 --oneline
npm ci
npx tsx --test
npm run showcase:release-check
```

先复现问题，再写失败测试，最后做最小修改。不要读取或复制个人 `claudio-ui-audit`、私人素材目录或 `localhost:5173` 的运行数据。
