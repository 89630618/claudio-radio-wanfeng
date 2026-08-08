# Claudio

> 你的情绪和所在的地方，就是我的提示词。我讨厌算法。我有自己的品味。

本地优先的个人 AI 电台。它把一句自然语言需求变成一首真实可播放的歌和一段可播出的 DJ 台词。

<p align="center">
  <img src="photos/claudio-radio-ui.png" alt="Claudio 电台界面" width="840" />
</p>

Claudio 把两件事分开处理：本地系统负责选歌、队列和播放可用性；模型只负责理解、品味与表达。这样模型失效时，电台仍能继续播放；模型工作时，主持人也不会越权改歌。

## 它解决什么问题

普通播放器会给你歌单，普通聊天机器人会给你一段话。Claudio 想做的是两者之间的那一段：你说“下雨天想听点有节奏但不吵的歌”，它先从可播放曲库选出下一首，再为这首歌写一句可以念出来的开场。

它不是“让 LLM 随便推荐一首歌”的 Demo。歌曲必须存在、可播放、经过冷却和去重；DJ 台词必须绑定已锁定的歌曲，并返回固定 JSON。

## 主要功能

- 用自然语言点歌、插队、请求下一首或生成场景歌单。
- 从 KuGou API 与本地音乐候补中选择真实可播放的曲目。
- 根据偏好、近期播放、时间、天气与日历调整选歌节奏。
- 由模型为锁定歌曲选择 2-3 条正向范式，再创作 DJ 台词。
- 使用 Fish Audio 合成语音；不可用时回退到浏览器语音。
- 通过 React PWA、REST 与 SSE 让歌曲、台词、语音和页面状态保持一致。

## 架构

<p align="center">
  <img src="photos/claudio-core-implementation-architecture-refined-2026-08.png" alt="Claudio 核心工程架构" width="840" />
</p>

核心边界只有三条：

1. 本地系统先选择并锁定 `songId`，模型不能自行换歌。
2. DJ 写作只读取人设、正向范式与当前锁定歌曲，不把天气、历史和原始偏好直接塞进 prompt。
3. 每次 DJ 决策都返回 `{ say, play, reason, segue }`；解析或 TTS 失败时仍有可交付的回退路径。

## 快速开始

### 前置条件

- Node.js 22 或更高版本
- 一个可用的 KuGou API 服务，或本地音乐目录
- 可选：OpenAI-compatible、DeepSeek 与 Fish Audio 的 API Key

```bash
git clone <your-repo-url>
cd claudio
copy .env.example .env
npm install
npm run dev
```

打开 `http://localhost:5173`。前端默认连接 `http://localhost:3080`。

macOS / Linux 请把 `copy .env.example .env` 改为：

```bash
cp .env.example .env
```

## 配置

所有密钥都只放在本地 `.env`；这个文件已被 Git 忽略，不能提交。

| 配置 | 用途 |
| --- | --- |
| `MUSIC_LIBRARY_DIR` | 本地音乐候补目录 |
| `USER_PROFILE_DIR` | 本地口味、反馈和访谈数据目录，默认 `.data/user` |
| `KUGOU_API_BASE_URL` | KuGou API 服务地址 |
| `AI_API_KEY`、`AI_MODEL` | 默认模型与 API Key |
| `DJ_AI_MODEL` | DJ 串词模型，可单独覆盖 |
| `CHAT_AI_API_KEY`、`CHAT_AI_MODEL` | 对话模型配置 |
| `FISH_TTS_API_KEY`、`FISH_TTS_VOICE_ID` | Fish Audio 语音配置 |

`.env.example` 提供了一套可运行的字段模板。模型与供应商可替换；项目只要求它们提供 OpenAI-compatible 或对应服务的 API。

首次运行时，Claudio 会在 `.data/user` 创建空白的口味档案。这里以及 `.data` 中的播放记录、KuGou 会话、TTS 缓存都属于个人运行数据，不会进入 Git。

Claudio 的界面头像作为产品资源随仓库提供；个人运行数据、音乐文件、账号会话与 API 凭据仍只保留在本机。

## 安全与内容边界

- 服务默认只监听 `127.0.0.1`。不要将开发服务器、`.data` 或带有账号会话的实例直接暴露到公网。
- 仓库不包含音乐文件、歌词、平台账号、Cookie 或播放历史。部署者需自行取得合法的音乐来源、平台访问权限与 API 凭据。
- KuGou-compatible 服务是可替换的外部依赖；请自行审查其许可证、固定版本和平台条款。`scripts/setup-kugou-api.ps1` 固定到已审查提交 `06560e3e053bda1ab830750db6f645bab703f824`，不会自动追随上游最新代码。项目不会提供共享账号或公共音频转发服务。

## 使用方式

在输入框直接说出场景或动作，例如：

```text
下雨天想听点有节奏但不吵的歌
播放 The xx - Intro
把下一首插进队列
给我一份今晚写代码的歌单
```

系统会先返回可播放的歌曲，再生成与该歌曲绑定的 DJ 台词。天气、日历和偏好参与选歌；它们默认不进入台词正文。

## 输入与输出示例

请求下一首：

```bash
curl -X POST http://localhost:3080/api/radio/next ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"下雨天想听点有节奏但不吵的歌\"}"
```

返回值包含已锁定的歌曲 ID、选择原因与来源。字段会随运行数据变化：

```json
{
  "songId": "local-or-kugou-track-id",
  "djLine": "",
  "reason": "scene and preference match",
  "moodTags": ["weather"],
  "source": "rules"
}
```

为该歌曲生成主持人台词：

```bash
curl -X POST http://localhost:3080/api/dj/line ^
  -H "Content-Type: application/json" ^
  -d "{\"songId\":\"local-or-kugou-track-id\",\"query\":\"下雨天想听点有节奏但不吵的歌\"}"
```

输出固定为：

```json
{
  "say": "用于 TTS 与字幕的 DJ 台词",
  "play": ["local-or-kugou-track-id"],
  "reason": "仅供系统内部使用的推荐原因",
  "segue": "fade_in"
}
```

## 开发与验证

```bash
npm run smoke
npm run build
npm run dj:model-first-minimal-quality
npm run dj:fewshot-selected-five
```

## 当前范围

Claudio 当前专注于“可靠播放 + 有品味的表达”。歌词、热评、故事卡、复杂 scheduler 与未经验证的外部资料不在正式 DJ 写作链路内。

## 许可证

代码、项目文档与随仓库提供的原创材料采用 [Apache License 2.0](LICENSE)。

Copyright (c) 2026 89630618

Claudio 是独立项目与虚构主持人名称，不隶属 Anthropic 或 Claude 产品。音乐、平台服务与模型 API 均为使用者自行配置的外部依赖。
