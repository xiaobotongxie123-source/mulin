# 暮林夜话 · MULIN NIGHTFALL

九人局狼人杀 · Vue 3 + TypeScript + Three.js 单机 3D 原型。可选接入 8 位 LLM 智能体。

- 3 狼人 / 3 村民 / 1 女巫 / 1 守卫 / 1 预言家
- 玩家固定 1 号位，8 位 AI 旅人
- 无联机；无 Key 时不需要后端，程序化 3D 暮林山舍，完整夜间、发言、投票、遗言、终局
- 首页含满月、四位持灯旅人、电影感木屋细节与暖光石径
- 牌桌夜间统一闭眼、天亮睁眼；出局者落座、存活者站立；白昼切换为清透低雾日光
- 可选 Node 智能体代理：8 位 AI 旅人各自接入 OpenAI 兼容模型 / 灵矽角色人设
- 灵矽AI 角色语音：每句先预合成，文字与语音同一瞬间出现，播完才进入下一位；后一句在当前语音下预取；灵矽响应过慢时自动回退浏览器语音；9 位玩家各有独立音色，可一键关闭
- 服务端 TTS 不可用时自动回退到浏览器中文语音，仍保持每个角色不同音高与语速
- 规则弹窗内置 6 张角色卡插画（狼人、预言家、女巫、猎人、村民、守卫），猎人卡为本局外的角色设定预览

## 运行

需要 Node.js 22+（服务端语音桥接使用内置 WebSocket）。

```bash
npm install
npm run dev
# http://127.0.0.1:5188
```

```bash
npm run typecheck
npm run build
npm run preview

# 智能体（可选）
cp .env.example .env
# 填入 AGENT_LLM_API_KEY
npm run dev

# 创建 / 更新 9 个 Xrobot 智能体 + 9 套角色音色（可选，需要 XROBO_API_KEY）
npm run agents:dry-run
npm run agents:provision
```

不配置 Key 也能玩；大厅会显示「本地策略」。配置 `XROBO_API_KEY` 后显示「灵矽智能体 · 9 位已建」；再配置 `AGENT_LLM_API_KEY` 才显示「智能体在线 · 9 位」，8 位旅人的发言由模型生成。语音默认开启，牌桌顶部可单独关闭角色语音。

## 设计文档

完整流程、状态机、组件树、3D 场景、规则与取舍见 [DESIGN.md](DESIGN.md)。

智能体接入、Key 配置、9 个 Xrobot 智能体（8 位 AI + 1 号语音）创建方式见 [docs/AGENT_INTEGRATION.md](docs/AGENT_INTEGRATION.md)。

## 角色卡

![角色图鉴](docs/screenshots/06-role-cards.png)

## 截图

| 首页 | 牌桌 · 夜 |
| --- | --- |
| ![首页](docs/screenshots/01-home.png) | ![狼人行动](docs/screenshots/03-table-wolf.png) |

| 牌桌 · 天亮 | 守卫行动 |
| --- | --- |
| ![白天牌桌](docs/screenshots/03-table-day.png) | ![守卫](docs/screenshots/03-table-guard.png) |

| 终局 |
| --- |
| ![终局](docs/screenshots/05-result-good.png) |

| 移动端牌桌 | 移动端终局 |
| --- | --- |
| ![移动端牌桌](docs/screenshots/04-table-mobile.png) | ![移动端终局](docs/screenshots/05-result-mobile.png) |

## 目录

```
src/
├─ game/       规则引擎、AI、异步控制器
├─ stores/     Pinia 单一状态源
├─ three/      程序化场景、相机、投影
├─ assets/roles/ 角色卡插画（程序化 SVG）
├─ components/ 3D 画布、牌桌 HUD、UI 基础件
└─ views/      首页 / 大厅 / 身份 / 牌桌 / 终局
```

> 角色卡插画为原创程序化 SVG，不依赖外部图片服务。

## 说明

参考页 `forest-cabin.html` 中的 Three.js 代码不完整；当前 3D 场景按参考页的美术方向重新程序化搭建，首屏直接进入暮林夜话，不再有加载幕布。
