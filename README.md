# Claudio Showcase

> 音乐内容说明：本分支内的五首歌曲均为产品演示而截取的短片段，仅用于非商业产品展示；不提供完整录音、不用于商业发行、销售或独立音乐分发。每首片段的来源与演示授权说明见 [ASSET-LICENSES.md](ASSET-LICENSES.md)。

`showcase` 是 Claudio 的独立静态展示分支。它保留当前电台的主持人页、串词页、播放器、歌单、主题和 9:16 竖屏体验，但只使用仓库内预生成的串词与音频。展示版不包含后端、账号、API Key、LLM、Fish Audio、KuGou、聊天输入或任何运行时 `/api/*` 请求。

## 当前内容

- 后来 - 刘若英
- 逍遥叹 - 胡歌
- 蒲公英的约定 - 周杰伦
- 遇见 - 孙燕姿
- 星座书上 - 许嵩

每首均包含歌曲片段、预生成 DJ 串词音频和项目通用封面。曲目在 `public/showcase/tracks/`，配置在 `public/showcase/catalog.json`；具体来源、授权范围和署名以 [ASSET-LICENSES.md](ASSET-LICENSES.md) 为准。

## 本地运行

要求 Node.js 24。

```powershell
git clone --branch showcase https://github.com/89630618/claudio-radio-wanfeng.git
cd claudio-radio-wanfeng
npm ci
npm run dev:showcase
```

打开 `http://127.0.0.1:5176/claudio-radio-wanfeng/`。首次进入需要点击“进入电台”，用于解锁浏览器音频播放。手机端使用安全区域和动态视口；桌面端将完整电台界面居中显示为 9:16 舞台。

## 播放方式

- 人声协同：歌曲从开头播放，到配置的第一句人声标记时启动串词；主动拖过该标记后，本曲不会再自动启动串词。
- 开头播放：歌曲先播放约 3 秒，再开始串词。

串词播放期间歌曲自动降低至用户音量的 55%，串词结束后恢复。切歌会立刻停止上一首串词；歌曲片段结束不会中断仍在播放的串词。串词页提供逐字高亮、自动跟随滚动和歌曲进度标记。

## 内容更新

本机执行 `npm run showcase:import` 可打开素材导入工具。导入后依次执行：

```powershell
npm run showcase:validate:release
npm run build
npm run showcase:scan-build
```

校验会检查曲目数量、文件、路径、时长、体积和 `ASSET-LICENSES.md` 是否一致。发布前可一次性运行：

```powershell
npm run showcase:release-check
```

该命令会执行发布级素材校验、静态构建和构建物安全扫描；未通过时不得部署。

## 构建与部署

`npm run build` 输出静态目录 `dist-showcase`，基础路径固定为 `/claudio-radio-wanfeng/`。

Showcase 已发布到：

https://89630618.github.io/claudio-radio-wanfeng/

后续 Pages 工作流只能手动触发，默认仅验证和打包；只有在 GitHub Actions 中明确选择 `deploy=true` 才会更新该地址。推送 `showcase` 分支不会自动公开部署。

## 许可

代码及明确标注为原创的项目材料使用 [Apache-2.0](LICENSE)。歌曲片段、DJ 音频及其相关信息不随 Apache-2.0 授权，具体说明以 [ASSET-LICENSES.md](ASSET-LICENSES.md) 为准。
