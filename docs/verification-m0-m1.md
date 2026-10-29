# M0+M1 验收记录

日期：2026-10-29　环境：macOS 26.2 / Node 25.9 / Electron 45 / Pi 1.4.0

## 自动化

| 项 | 命令 | 结果 |
|---|---|---|
| 单测 17 条（JSONL 分帧、PiManager、chat reducer） | `npx vitest run` | 通过 |
| 类型检查（main/preload/shared、renderer） | `npx tsc --noEmit -p tsconfig.node.json` / `tsconfig.web.json` | 通过 |
| 生产构建 | `npx electron-vite build` | 通过（renderer 1.18MB，未分包） |

## 端到端（Electron + 真 pi 子进程，经 CDP 驱动断言）

1. 启动后渲染进程完成 bootstrap：模型 2 个（DeepSeek V4.1 Flash / V4 Pro）、thinking 级别 off/low/high/max、cwd 正确落到左栏。
2. 发送「只回复两个字：收到」→ 用户气泡、assistant 文本、usage 行（208 in / 2 out · $0.0001）正常渲染。
3. 发送「用 bash 执行 printf "hello"…」→ 生成 2 张工具卡片（read / bash），卡片显示参数摘要与耗时，输出可展开。
4. reasoning：thinking 级别 high 时出现「思考过程」折叠块，默认收起。
5. 中断：运行中出现「停止」按钮，`abort` 后按钮消失，气泡尾部显示 `Request was aborted`。
6. `/` 命令菜单：输入 `/sk` 列出真实 skill 命令（`/skill:branch-create` 等），清空输入后菜单消失。

## 本轮未做（有意推迟）

- 会话列表与历史恢复（M2，需读 `~/.pi/agent/sessions/`）
- `@` 文件引用（依赖 M2 的文件索引）
- 右栏文件树 / 终端（M2）
- 审批卡片 `extension_ui_request`（M3）
- CSP、代码签名、打包（M3）；当前 renderer 未设 CSP，Electron 会打安全警告
- 多窗口：当前一个窗口一个 pi 子进程，无并发会话
