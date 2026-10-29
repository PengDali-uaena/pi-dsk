# M3 验收记录

日期：2026-10-29　环境：macOS 26.2 / Electron 45 / electron-builder 26

## 交付

| 能力 | 实现 | 验证方式 |
|---|---|---|
| 扩展对话框 | `extension_ui_request` 的 select / confirm / input / editor 进 store，渲染成模态框，结果写回 `extension_ui_response` | 用官方 `examples/extensions/rpc-demo.ts` 触发 `ctx.ui.input`，输入后扩展收到值并 `notify` 回显 |
| 通知 | `notify` → 右下角 toast，6 秒自动消失 | demo 的 "You entered: …" 正常弹出 |
| 状态栏 | `setStatus` → 顶栏 chip；空字符串即清除 | demo 的 `Turns: N` 出现并随 turn 更新 |
| 组件块 | `setWidget` → 输入框上方/下方等宽文本块 | demo 的 "--- RPC Extension UI Demo ---" 显示 |
| 窗口标题 | `setTitle` → `document.title` | 标题变成 `pi RPC Demo` |
| 预填输入框 | `set_editor_text` → composer 草稿 | `/rpc-prefill` 后输入框内容为扩展写的文本 |
| 主题 | 暗/亮两套 CSS 变量，设置抽屉切换，写入 localStorage | 切换后 `data-theme` 变化、重载保持 |
| CSP | 构建期注入 meta（dev 不注入，避免挡住 vite 热更新） | 打包版启动无 Electron 安全警告，无 Refused 日志 |
| 打包 | `electron-builder --mac dmg`，node-pty 走 `asarUnpack` | `release/Pi Desktop-0.1.0-arm64.dmg`（119MB）；解包版启动后 pi 连接、会话列表、终端 `echo` 均正常 |

## 过程中修掉的问题

1. **扩展 UI 请求被当成会话事件**：`extension_ui_request` 原本会流进 chat reducer。改为在 store 入口先分流，对话框 / toast / status / widget / 标题 / 草稿各走各的路径。
2. **CSP 会挡开发热更新**：改成只在 `apply: 'build'` 的 vite 插件里注入 meta。
3. **打包后 node-pty 找不到原生模块**：`electron-builder` 自动 rebuild 之外还要 `asarUnpack`，否则 `.node` 包在 asar 里无法 dlopen。

## 已知限制

- macOS 包未签名（`identity: null`），首次打开要走「仍要打开」；没有应用图标，用的是 Electron 默认图标。
- 未做自动更新、未做 Windows 包。
- 单窗口单进程；多工作区并行仍是 M3 之后的开放项。

## 测试噪声（记录备查）

验证对话框时，页面里出现了非本程序产生的真实按键（数字 + Enter）。排查确认是本机上其它 Cursor agent worker 进程在往最前台窗口输入，与 pi-dsk 无关；本项目的对话框与回写链路仍按预期工作（扩展收到了输入值）。

## 自动化

`npx vitest run` 21 条通过；`tsc --noEmit` 两侧通过；`electron-vite build` 与 `electron-builder --mac dmg` 通过。
