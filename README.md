# Pi Desktop（pi-dsk）

给 [Pi Agent](https://github.com/earendil-works/pi-coding-agent) 做的桌面图形界面。

界面结构与功能分层对标 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的桌面端，agent 能力完全复用本机已安装的 `pi`。

> 它不是一个新 agent，只是 Pi 的一个图形前端：所有推理、工具调用、会话存储都还是 Pi 自己那一套。

[![release](https://img.shields.io/github/v/release/PengDali-uaena/pi-dsk)](https://github.com/PengDali-uaena/pi-dsk/releases/latest)

## 安装

**下载（macOS arm64）**：[Pi.Desktop-0.0.1-arm64.dmg](https://github.com/PengDali-uaena/pi-dsk/releases/download/v0.0.1/Pi.Desktop-0.0.1-arm64.dmg) · 119 MB

```sh
sha256 Pi.Desktop-0.0.1-arm64.dmg
# 5ac97d0bd900d47593c3e1f784be96bc9f3894845ed27fcc6297856b3781671e
```

拖进「应用程序」即可。包未签名，首次打开需右键 →「打开」（或在「系统设置 → 隐私与安全性」里放行）。运行前本机要已装好 Pi CLI：`pi --version` 有输出。

## 功能

- **三栏布局**：左侧会话列表与工作区，中间对话，右侧文件树 / 文件预览 / 终端
- **流式对话**：markdown 渲染、reasoning 折叠块、工具调用卡片（参数摘要、耗时、输出可展开、失败高亮）、usage 行
- **运行控制**：发送、steering 排队、中断（`abort` 直到 `agent_settled` 才解锁）、模型与 thinking 级别切换
- **`/` 命令补全**：数据来自 Pi 的 `get_commands`，project skill 与 prompt template 都能直接选
- **历史会话**：主进程直接读 `~/.pi/agent/sessions/*/*.jsonl` 建索引；点一条就按该会话的 `cwd` 重启 pi 子进程并 `--session` 续上
- **工作区切换**：原生目录选择，换目录即换 pi 的工作目录
- **扩展 UI**：`extension_ui_request` 的 `select` / `confirm` / `input` / `editor` 渲染成模态框并回写结果；`notify` / `setStatus` / `setWidget` / `setTitle` / `set_editor_text` 也都有对应呈现
- **终端**：node-pty + xterm.js 的真 shell，独立于 pi 子进程，手敲的命令不进模型上下文
- **主题**：暗 / 亮两套，切换后持久化

## 原理

```
Electron 主进程 ── spawn ──> pi --mode rpc（JSONL 命令 / 事件）
      │  ▲
      │  └── ipcMain.handle('pi:command')   ← renderer 发 RPC 命令
      └───── webContents.send('pi:event')   → renderer 收事件流
                 │
          preload（contextBridge 白名单）
                 │
        renderer（React + zustand，无 Node 权限）
```

事件到界面的映射集中在 `src/shared/chat-reducer.ts`（纯函数、有单测）：`text_delta` 增量追加，`text_end` / `toolcall_end` 用权威内容覆盖，`message_end` 整体替换消息；工具卡片按 `toolCallId` 聚合。

## 从源码运行

- Node.js 20+
- 已安装并可运行 Pi CLI（`pi --version` 有输出）
- 目前只在 macOS arm64 上验证过



```sh
npm install
npm run dev        # Electron + Vite 热更新
npm test           # vitest 单测
npm run build      # 产物写到 out/
npm start          # 用构建产物启动
npm run dist       # 打包 dmg 到 release/
```

## 配置

| 环境变量 | 作用 | 默认 |
|---|---|---|
| `PI_DSK_PI_BIN` | 指定 pi 可执行文件 | `~/.pi/agent/bin/pi`，找不到则用 PATH 里的 `pi` |
| `PI_DSK_PI_ARGS` | 追加给 pi 子进程的参数，空格分隔（如 `-e ./my-ext.ts`） | 空 |

会话目录跟随 Pi 自己的设置（`--session-dir` / `PI_CODING_AGENT_SESSION_DIR`）。

## 目录结构

```
src/main/      主进程：窗口、pi 子进程管理、会话索引、文件读取、终端、IPC
src/preload/   contextBridge，只暴露白名单通道
src/shared/    RPC 类型、chat reducer
src/renderer/  React 界面：app / features / store / styles
tests/         vitest 单测
docs/          设计稿、实施计划、各阶段验收记录
```

## 已知限制

- macOS 包未签名、无应用图标（用的是 Electron 默认图标）
- 一个窗口一个 pi 子进程，没有多窗口并行
- 没有自动更新、没有 Windows / Linux 包

## 文档

- 设计稿：[docs/superpowers/specs/2026-10-29-pi-desktop-gui-design.md](docs/superpowers/specs/2026-10-29-pi-desktop-gui-design.md)
- 实施计划：[docs/superpowers/plans/2026-10-29-m0-m1.md](docs/superpowers/plans/2026-10-29-m0-m1.md)
- 验收记录：[M0+M1](docs/verification-m0-m1.md) / [M2](docs/verification-m2.md) / [M3](docs/verification-m3.md)

## 致谢

界面分层参考 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`packages/client/ui-*`）；agent 能力来自 [Pi](https://github.com/earendil-works/pi-coding-agent)。本项目没有搬它们的代码，只对齐了界面结构与交互。

## License

MIT
