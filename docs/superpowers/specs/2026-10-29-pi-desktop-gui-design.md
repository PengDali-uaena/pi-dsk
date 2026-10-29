# pi-dsk 桌面端设计稿

- 日期：2026-10-29
- 状态：待评审
- 项目目录：`~/pi-dsk`

## 1. 目标与非目标

**目标**：给 Pi Agent 做一个桌面图形界面，界面结构与功能层级对标开源项目 DeepSeek Harness 的桌面端；后端就是本机已有的 `pi` 可执行文件，不重新实现 agent 循环。

**非目标**（这一版明确不做）：

- 不做 DSH 的 Cordis 插件内核、插件市场、槽位（Slot）扩展体系
- 不做 Web 版对外服务（renderer 只在 Electron 窗口内加载）
- 不做多用户、账号、云同步、遥测
- 不做代码签名与自动更新（本地 `dmg`/`zip` 打包即止）

## 2. 参考基线

DSH（`github.com/deepseek-ai/deepseek-harness`，master 分支）的桌面端形态：

- `apps/desktop`：Electron 外壳，`dsh-app://app/` 加载打包好的 Web 前端，node IPC 只传启动注入、就绪、退出信号；应用自身的 HTTP/WebSocket 由内部 Host 提供。
- `packages/client/*`：界面按功能拆成一组 `ui-*` 包——`ui-layout`（三栏骨架）、`ui-chat`（会话渲染）、`ui-tool`（工具调用视图）、`ui-approval`（审批）、`ui-sidebar` / `ui-sidebar-files` / `ui-sidebar-terminal` / `ui-sidebar-right`（左导航与右上下文栏）、`ui-conversation`（输入区）、`ui-commands`（slash 命令）、`ui-settings-*`（设置各项）、`ui-theme`。

本项目只对齐「界面与功能分层」，即上表这些包所呈现的东西；DSH 的 Host/Cordis/插件加载全部替换为「主进程 + 一个 `pi --mode rpc` 子进程」。

## 3. 整体架构

三层 + 一个子进程：

```
┌────────────────────────────── Electron 主进程 ──────────────────────────────┐
│ 窗口/菜单/原生目录选择   session-index(读 ~/.pi/agent/sessions)   pi-manager │
│                                                                    │        │
│  ipcMain.handle('pi:command')  ◄── renderer 发起 RPC 命令          │ spawn  │
│  win.webContents.send('pi:event')  ──► renderer 接收事件流         │        │
└────────────────────────────────────────────────────────────────────┼────────┘
                                                                     ▼
                                                     pi --mode rpc（JSONL，stdin/stdout）
┌─ preload（contextBridge）──┐
│ window.pi = { send, on }   │
└────────────────────────────┘
┌──────── renderer（React，无 Node 权限）────────┐
│ app/AppFrame → 左栏 / 中间 chat / 右栏          │
└─────────────────────────────────────────────────┘
```

**关键决定**

1. renderer 不开 `nodeIntegration`，`contextIsolation: true`。所有文件系统与进程操作经 preload 白名单通道。
2. 一个窗口对应一个 `pi` 子进程。切换会话优先调 RPC 的 `switch_session`；跨工作目录或切换失败时重启子进程并带 `--session <path>`。
3. 协议类型不手抄。`src/shared/protocol.ts` 用 `import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent"` 加少量手写命令联合类型，避免 Pi 升级后类型漂移。
4. 状态管理用 `zustand`：轻、无 Provider 嵌套、可按事件流增量更新。不搬 DSH 自研的 `client/store`。

## 4. 目录结构

```
~/pi-dsk/
├─ package.json                 # 单包，不拆 workspace（界面规模不值得）
├─ electron/
│  ├─ main.ts                   # app 生命周期、窗口、菜单
│  ├─ preload.ts                # contextBridge 白名单
│  ├─ pi-manager.ts             # spawn / JSONL 分帧 / 重连 / abort
│  ├─ session-index.ts          # 扫 ~/.pi/agent/sessions，供左栏列表
│  └─ ipc.ts                    # 通道注册与参数校验
├─ src/
│  ├─ shared/protocol.ts        # RPC 命令与事件类型、IPC 通道常量
│  ├─ renderer/
│  │  ├─ main.tsx
│  │  ├─ app/AppFrame.tsx       # 三栏骨架 + 栏宽持久化
│  │  ├─ store/                 # session / chat / composer / ui 四个 store
│  │  ├─ features/
│  │  │  ├─ chat/               # 对应 ui-chat：ChatFlow、MessageItem、AssistantText、ReasoningBlock
│  │  │  ├─ tool/               # 对应 ui-tool：ToolCard、按工具名的专属视图（bash/read/edit）
│  │  │  ├─ approval/           # 对应 ui-approval：confirm/select/input 卡片
│  │  │  ├─ composer/           # 对应 ui-conversation：输入框、model 选择、slash、@ 引用、附件
│  │  │  ├─ sidebar-left/       # 对应 ui-sidebar：工作区 + 会话列表
│  │  │  ├─ sidebar-right/      # 对应 ui-sidebar-right：文件树 / 终端 / 预览
│  │  │  ├─ settings/           # 对应 ui-settings-*：models / general / shell
│  │  │  └─ theme/
│  │  └─ components/            # 本地 primitives（Button、Dialog、Tag、Markdown）
│  └─ styles/
└─ docs/superpowers/specs/
```

## 5. 界面分层与里程碑对应

| DSH 包 | pi-dsk 模块 | 承载功能 | 里程碑 |
|---|---|---|---|
| `ui-layout` | `app/AppFrame` | 三栏、栏宽可拖、左右栏可折叠、快捷键 | M0 |
| `ui-chat` | `features/chat` | 流式文本、markdown、reasoning 折叠、消息操作（复制/重发）、compaction 条目、usage 行 | M1 |
| `ui-tool` | `features/tool` | 工具调用卡片，按 `toolCallId` 聚合，bash 输出可折叠可 tail，edit/write 显示 diff | M1 |
| `ui-conversation` | `features/composer` | 多行输入、Enter 发送、Shift+Enter 换行、发送/中断按钮、排队 chip | M1 |
| `ui-commands` | `features/composer/commands` | `/` 触发，数据来自 RPC `get_commands` | M1 |
| `ui-sidebar` | `features/sidebar-left` | 工作区选择 + 会话列表（来自 `session-index`） | M2 |
| `ui-sidebar-files` | `features/sidebar-right/Files` | 当前 cwd 文件树，点击打开预览 | M2 |
| `ui-sidebar-terminal` | `features/sidebar-right/Terminal` | xterm.js + node-pty，独立于 pi 子进程 | M2 |
| `ui-settings-*` | `features/settings` | 模型与 thinking 级别、主题、会话目录、shell | M2 |
| `ui-approval` | `features/approval` | 转发 `extension_ui_request` 的 confirm/select/input，回 `extension_ui_response` | M3 |
| `ui-theme` | `features/theme` | 亮/暗/跟随系统 | M3 |

## 6. 协议映射

### 6.1 前端 → 主进程 → pi（用到的命令）

| 场景 | RPC 命令 |
|---|---|
| 发送消息 | `prompt` |
| 打断 | `abort` |
| 首屏状态 | `get_state`、`get_messages`、`get_available_models`、`get_available_thinking_levels`、`get_commands` |
| 模型 / 思考级别 | `set_model`、`cycle_model`、`set_thinking_level` |
| 会话 | `new_session`、`switch_session`、`set_session_name`、`get_session_stats`、`get_tree`、`fork` |
| 压缩 | `compact` |
| 终端命令卡片（可选） | `bash`、`abort_bash` |

### 6.2 pi → 前端（事件 → 界面）

| 事件 | 界面表现 |
|---|---|
| `message_start` / `message_update` / `message_end` | 追加气泡；`text_delta` 增量追加，`text_end` / `toolcall_end` 用权威内容覆盖，`message_end.message` 整体替换 |
| `thinking_start` / `thinking_delta` / `thinking_end` | reasoning 折叠块，运行时可展开，结束后默认收起 |
| `tool_execution_start` / `_update` / `_end` | 按 `toolCallId` 生成/更新工具卡片；`durationMs`、`isError` 上角标 |
| `turn_start` / `turn_end` | 分隔线（新 turn）与用量统计 |
| `agent_start` / `agent_end` / `agent_settled` | 运行态指示器；`agent_settled` 才解除"停止"按钮 |
| `queue_update` | composer 上方排队 chip（steering / followUp） |
| `compaction_start` / `compaction_end` | 聊天流内插入压缩分隔条目 |
| `thinking_level_changed` / `session_info_changed` | 顶栏与设置面板同步 |
| `extension_ui_request` | 审批卡片 / 通知 / 状态栏（M3） |
| `extension_error` | 开发面板 + toast |

### 6.3 会话列表来源

RPC 没有"列出全部会话"的命令，所以左栏列表由主进程直接读盘：`~/.pi/agent/sessions/<escaped-cwd>/<timestamp>_<uuid>.jsonl`。每项取首行 header（`cwd`、`timestamp`、`id`）与首个 user 消息前 80 字作标题；`fs.watch` 做增量刷新。目录按 `--session-dir` / `PI_CODING_AGENT_SESSION_DIR` 覆盖后再取。

## 7. 关键交互细节

- **流式渲染的替换规则**必须在 reducer 里写死，否则会出现闪烁与重复：delta 只进缓冲区，`*_end` 用权威内容覆盖整块，`message_end` 用完整消息替换整个气泡。
- **工具卡片默认折叠**，失败（`isError`）或 `bash` 的 stderr 默认展开。
- **中断语义**：点停止发 `abort`，按钮保持 disabled 直到 `agent_settled`。
- **会话切换**不清空右栏；文件树跟随新的 `get_state().cwd`。
- **输入框草稿**按会话 ID 存本地，切换不丢。

## 8. 里程碑

| 阶段 | 交付 | 验收 |
|---|---|---|
| **M0 骨架** | 窗口、三栏、主进程 spawn `pi --mode rpc`、发一句话并流式显示 | 敲 "hi" 能看到逐字输出 |
| **M1 对话完整** | markdown、reasoning、工具卡片、usage、abort、composer（多行 / `/` 命令 / `@` 文件）/ 模型与 thinking 切换 | 跑一次真实代码修改任务，卡片与终态正确 |
| **M2 导航** | 工作区 + 会话列表、右栏文件树与预览、终端面板、设置面板 | 能在 GUI 里续上历史会话 |
| **M3 收尾** | 审批卡片、compaction 条目、错误与重启、亮暗主题、`dmg` 打包 | 打包产物可双击启动 |

## 9. 错误处理

- 子进程异常退出：聊天流内插入错误卡片，带"重启并恢复本会话"按钮。
- RPC `response.success === false`：toast 提示，界面状态回滚到命令发送前。
- stdout 分帧：只按 `\n` 切分，处理 CRLF 与跨 chunk 半行；非法 JSON 记日志丢弃，不阻塞后续事件。
- 会话文件损坏或被删：列表项跳过，打开时提示「会话不存在」。
- extension UI 请求超时（客户端未响应）：主进程回 cancellation，避免 pi 侧挂住。

## 10. 测试

- **单测（必做）**：JSONL 分帧器；事件 → 消息 reducer（覆盖 delta/end/message_end 覆盖顺序、toolCallId 聚合、乱序事件）。
- **集成（必做）**：spawn 真 `pi`，跑 `get_state` → `prompt` → 收集事件 → `abort`，断言事件序列关键节点与退出清理。
- **验收（必做，人工）**：M1 里跑一次真实任务，手动核对工具卡片耗时、错误态、中断响应、草稿保存。

不引入 E2E 框架（Playwright/WebdriverIO）：Electron 打包链路在本机做人工验收即可，成本不划算。

## 11. 未决问题

1. 会话切换用 `switch_session` 还是重启子进程——M1 实测两者的上下文保持差异后定。
2. 终端面板：xterm.js + `node-pty`（真 shell）还是复用 pi 的 `bash` 命令（只读输出）。建议前者，与 pi 解耦；代价是多一个原生依赖。
3. 是否要多窗口 / 多会话并行——M3 之后再评估，架构上主进程已按「每窗口一个 manager」预留。
4. `@` 文件引用的补全数据源：主进程遍历 cwd，还是等 Pi 提供候选接口。
