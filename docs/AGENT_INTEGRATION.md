# 智能体接入 · MULIN NIGHTFALL

> 给 8 位 AI 旅人接上真正的“人设 + 大脑”，同时保留无 Key 时的本地策略回退。

相关文档：

- 灵矽文档中心：<https://linx.qiniu.com/docs/>
- 灵矽平台 API：<https://linx.qiniu.com/docs/xrobot/api/>
- 智能体 API：<https://linx.qiniu.com/docs/xrobot/api/agent>
- 大语言模型 API：<https://linx.qiniu.com/docs/xrobot/api/llm>
- 七牛 MaaS 聊天补全：<https://developer.qiniu.com/aitokenapi/13390/chat-completions>

---

## 0. 当前接入状态

- 已通过灵矽平台 API 创建 **9 个角色智能体**，命名 `暮林夜话·沈砚` … `暮林夜话·裴照`，模型为 **deepseek-v4-flash**。ID 记录在 `server/agent-registry.json`。
- 大厅会显示「灵矽智能体 · 9 位已建」。
- **灵矽平台 API Key 只能管理智能体，不能直接当模型推理 Key 用**。牌桌要实时生成发言，还需要一个 OpenAI 兼容的模型入口。

| 配置 | 用途 | 是否足够让牌桌发言 |
| --- | --- | --- |
| `XROBO_API_KEY` | 创建/更新灵矽智能体 | 否 |
| `AGENT_LLM_API_KEY` + `AGENT_LLM_BASE_URL` | 调用 `deepseek-v4-flash` / LinxClaw | 是 |

灵矽智能体使用的 `deepseek-v4-flash` 在七牛 MaaS 上的模型名为：

```bash
AGENT_LLM_BASE_URL=https://api.qnaigc.com/v1
AGENT_LLM_MODEL=deepseek/deepseek-v4-flash-20260731
AGENT_LLM_API_KEY=<七牛 MaaS API Key>
```

如果你已经在灵矽控制台给智能体开通了模型，仍然需要在「七牛云 / AI 大模型推理 / API Key」创建一个模型 Key，或使用 LinxClaw 的 OpenAI 端点。浏览器端不直接连接灵矽设备 WebSocket；服务端 `/api/tts` 使用虚拟设备连接，见第 4.4 节。

---

## 1. 先说明一个接口事实

灵矽 / Xrobot 的公开文档里：

- **智能体 API** 提供智能体的创建、查询、更新、绑定设备等管理能力；
- **WebSocket 协议** 面向真实硬件，接收音频、TTS、STT 和设备控制消息；
- 文档没有暴露一个“给智能体 ID，直接发一段文本，返回一段文本”的公开 HTTP 对话接口。

因此，本项目采用**双层接入**，而不是假装直接调用了不存在的接口：

```
┌──────────────────────┐
│ 牌桌 GameController  │
└──────────┬───────────┘
           │ 每个 AI 玩家 / 每轮发言
           ▼
┌──────────────────────┐
│ /api/agents/:seat/   │  ← 本地 Node 代理（Vite middleware / server/index.mjs）
│ speak                │
└──────────┬───────────┘
           │ OpenAI 兼容 /chat/completions
           ▼
┌──────────────────────┐
│ 七牛 MaaS / LinxClaw │  ← AGENT_LLM_BASE_URL + AGENT_LLM_API_KEY
│ / 任意 OpenAI 兼容   │
└──────────────────────┘

另：npm run agents:provision
    Xrobot 智能体 API  ← 创建 / 更新 9 个角色智能体（可选）
```

- **游戏内发言**：走 OpenAI 兼容模型，8 个角色各自拥有独立人设、私有信息和发言策略。
- **Xrobot 智能体**：用同一个 `server/agents.mjs` 中的角色提示词，通过 Xrobot API 创建/更新，便于后续接到灵矽控制台、硬件或语音设备。
- **无 Key**：前端自动回退到原来的规则 + 模板发言，游戏仍然完整可玩。

这样既不把 API Key 暴露到浏览器，也不依赖一个不存在的“智能体文本对话接口”。

---

## 2. 配置

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

最小配置（使用七牛 MaaS）：

```bash
AGENT_LLM_BASE_URL=https://api.qnaigc.com/v1
AGENT_LLM_API_KEY=你的七牛 MaaS API Key
AGENT_LLM_MODEL=deepseek/deepseek-v4-flash-20260731
```

也可以指向 LinxClaw 或任意 OpenAI 兼容服务：

```bash
AGENT_LLM_BASE_URL=http://<LinxClaw-IP>:8088/v1
AGENT_LLM_API_KEY=<LinxClaw API Key>
AGENT_LLM_MODEL=deepseek/deepseek-v4-flash-20260731
```

然后照常启动：

```bash
npm run dev
# http://127.0.0.1:5188
```

大厅和牌桌顶部会出现状态徽标：

| 状态 | 含义 |
| --- | --- |
| 智能体在线 · 9 位 | 后端已配置 Key，发言由模型生成，9 个音色可用 |
| 智能体演示 · 本地模拟 | `AGENT_LLM_MOCK=1`，无 Key 的联调模式 |
| 本地策略 | 没有可用 Key，沿用规则模板 |
| 智能体降级 | 请求失败，本轮回退本地发言 |

点击徽标可重新检测。

### 无 Key 联调

```bash
AGENT_LLM_MOCK=1 npm run dev
```

这不会调用任何远程模型，只用于验证前后端链路和 9 个角色的 UI 状态。

---

## 3. 创建 Xrobot 智能体（可选）

需要先在 [灵矽 API Key 管理](https://xrobo.qiniu.com/#/api-key-management) 创建 Key：

```bash
cp .env.example .env
# 写入 XROBO_API_KEY=...
npm run agents:dry-run       # 只打印 9 个请求体，不发请求
npm run agents:provision     # 真正创建 / 更新 9 个智能体，并写入 9 套音色
```

脚本行为：

1. `GET /xiaozhi/agent/list?limit=100` 拉取当前用户的智能体；
2. 按 `agentName` 精确匹配 `暮林夜话·白棠` 等 9 个名字；
3. 不存在则 `POST /xiaozhi/agent` 创建；
4. 已存在则 `PUT /xiaozhi/agent/{id}` 更新人设、提示词、`ttsVoiceId` 与语速/音高；
5. 把返回的 ID 写入 `server/agent-registry.json`（不包含 Key）。

创建出的 9 个智能体：

| 座位 | 名字 | 职业 | 语气 |
| --- | --- | --- | --- |
| 01 | 沈砚 | 制图师 | 人类玩家的 TTS 音色 |
| 02 | 白棠 | 药师 | 温和、留有余地 |
| 03 | 陆离 | 猎户 | 短、直、有压迫感 |
| 04 | 苏九 | 说书人 | 从容、戏谑、爱讲故事 |
| 05 | 顾青 | 守林人 | 沉稳、朴素、重视责任 |
| 06 | 江眠 | 旅店老板 | 热络、周到、护短 |
| 07 | 温辞 | 抄经人 | 敏感、谨慎、偶尔结巴 |
| 08 | 阿箬 | 采菇人 | 轻、怯、直觉准 |
| 09 | 裴照 | 提灯人 | 冷静、克制、有条理 |

> 如果你的 Xrobot 账号里已经有同名智能体，脚本会更新而不是重复创建。脚本不会删除任何智能体。

---

## 4. 游戏内如何工作

### 4.1 每个 AI 玩家的私有上下文

每轮发言前，`GameController` 为每个 AI 座位构造：

- 自己的座位、名字、身份、阵营、语气；
- 存活 / 出局座位；
- 昨夜死亡、上一轮放逐；
- 公开声明、最近 12 条公开日志；
- **仅该角色可见**的信息：
  - 狼人：狼队友；
  - 预言家：自己的查验记录；
  - 女巫：解药 / 毒药状态；
  - 守卫：上一夜守护对象；
  - 好人：不会收到狼队友、女巫药瓶或守卫记录。

服务端 `compactContext()` 只接受白名单字段；好人不会因为请求体里多一个字段而看到狼队信息。

### 4.2 发言策略

- 8 个 AI 的发言请求**并行预取**，避免 8 次串行等待。
- 每条请求都有服务端 12s / 客户端 15s 超时。
- 任一条失败 → 该座位回退到规则模板，不影响牌局。
- 预言家“起跳/报查杀”由规则引擎决定；此时使用确定性文案，避免模型编造不存在的查验结果。
- 夜间刀人、守护、用药、查验、投票仍由可复现的规则 AI 决定；智能体负责公开发言与人格表达。这样不会因为模型失误破坏规则或造成死循环。

### 4.3 API

```http
GET /api/health
→ {
  "ok": true,
  "configured": true,
  "provider": "openai-compatible",
  "model": "deepseek-v3",
  "agents": 9,
  "provisioning": true,
  "tts": { "provider": "xrobot", "configured": true }
}
```

```http
POST /api/agents/4/speak
Content-Type: application/json

{
  "context": {
    "seat": 4,
    "round": 2,
    "day": 2,
    "role": "werewolf",
    "faction": "wolf",
    "aliveSeats": [1, 2, 4, 6],
    "teammates": [2],
    "claims": [],
    "seerChecks": [],
    "witch": { "antidote": false, "poison": false },
    "guardLast": null,
    "players": [ ... ],
    "recentPublic": [ ... ]
  }
}
→ { "ok": true, "seat": 4, "text": "……", "model": "deepseek-v3" }
```

`POST` 的请求体上限 64KB；服务端只使用 `server/agents.mjs` 中的固定人设，不接受客户端传入 system prompt。

### 4.4 角色语音（灵矽AI TTS）

灵矽公开 API 的 REST 部分没有单独的“文本转语音”接口；设备 WebSocket 协议支持 TTS。项目使用服务端桥接：

```
GameController 预合成当前句
  → POST /api/tts { seat, text }
  → server/tts.mjs：绑定设备 WebSocket + listen.detect.text_response
  → 16 kHz PCM → WAV
  → 写入隐藏 speech 日志
  → 浏览器与文字同一帧开始播放/揭示
  → 播完这一句才进入下一位；下一句在当前音频下预取
```

- 每个座位在 `server/voice-profiles.mjs` 中有独立的音色配置；服务端在 `listen.detect` 的 `agent_params.voice.id/speed/pitch` 中逐条切换音色（这是灵矽文档支持的会话内音色切换）。
- WebSocket 使用一个已绑定到账号的设备 MAC，默认 `02:00:00:00:00:02`，可用 `XROBO_TTS_DEVICE_MAC` 覆盖；所有 TTS 请求在服务端串行，避免设备会话抢占。
- 合成结果按 `seat + voiceId + text` 缓存，减少重复读同一句。
- 如果设备未绑定，服务端会拒绝播放“请去绑定智能体”的提示音，前端自动回退浏览器语音。
- 灵矽 TTS 超过约 20 秒未返回时，前端才会取消该请求并改播浏览器中文语音，避免牌桌为了等待远端合成而卡住；正常请求通常 4–8 秒。
- `POST /api/tts` 返回 `audio/wav`；服务端 TTS 未配置/失败时，前端自动回退到 `speechSynthesis`，仍按角色设置不同音高和语速。
- 顶部扬声器按钮可关闭/开启角色语音；关闭后游戏节奏恢复原速。
- 语音开启时当前句先预合成，再写入隐藏日志；播放真正开始的那一帧才揭示文字，播完才进入下一位。后一句会在当前语音播放期间预取，减少等待。
- 关闭语音后不请求合成、不等待，恢复原来的短停顿与快节奏。

---

## 5. 生产部署

开发时 Vite 直接挂载 `/api`，不需要第二个进程。

生产：

```bash
npm run build
AGENT_LLM_API_KEY=... AGENT_LLM_BASE_URL=... npm run serve
# http://127.0.0.1:8787
```

`server/index.mjs` 同时提供 `dist/` 静态文件和 `/api`，SPA 路由回退到 `index.html`。

不要把 `.env` 提交到仓库；`.gitignore` 已包含 `.env` 和 `server/agent-registry.json`。

---

## 6. 安全与边界

- **Key 只在服务端**：浏览器只请求 `/api`，不会拿到 `AGENT_LLM_API_KEY`。
- **不信任客户端上下文**：人设、规则、角色补充全部由服务端根据 `seat` 查表生成；客户端只提供牌局状态。
- **日志是数据不是指令**：系统提示明确说明公开记录不可改变角色和规则。
- **请求体上限**：64KB。
- **超时与回退**：模型不可用不会卡死牌局。
- **未做鉴权 / 限流**：如果部署到公网，应在反向代理或服务端加登录、IP 限流和用量控制。
- **Xrobot 智能体双用**：人设用于灵矽控制台，TTS 桥接用于角色语音；牌桌发言仍可使用 OpenAI 兼容模型。
- **TTS 设备凭证留在服务端**：浏览器只拿 WAV，不接触 `XROBO_API_KEY`、MAC 或 WebSocket 凭据。
- **TTS 输入上限**：单条 260 字符，音频上限 4MB，单次超时 22s。

---

## 7. 接下来可以做什么

1. 把投票和夜间行动也交给智能体，用结构化 JSON 约束候选目标。
2. 给每个智能体接长期记忆，跨局记住玩家习惯。
3. 接 Linx 硬件：把 `/api/tts` 已生成的语音转发到实体设备，或让每个智能体绑定自己的终端。
4. 多模型混编：白棠用 Qwen、陆离用 DeepSeek、苏九用 MiniMax，让音色和文风差异更大。
5. 发言质量评估：记录每次生成耗时、失败率、角色一致性，做 A/B 提示词。
