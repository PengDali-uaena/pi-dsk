# M2 验收记录

日期：2026-10-29　环境：macOS 26.2 / Electron 45 / node-pty 1.1.0 / @xterm/xterm 5.x

## 交付

| 能力 | 实现 | 验证方式 |
|---|---|---|
| 会话列表 | 主进程扫 `~/.pi/agent/sessions/*/*.jsonl`，取 header + 首条 user 消息作标题，按时间倒序 | 列出 17 条真实会话，标题/项目/相对时间正确 |
| 打开历史会话 | `openSession(path)` → 按该会话的 `cwd` 重启 pi 子进程并带 `--session` | 打开旧会话后恢复 2 条消息与 usage |
| 工作区切换 | 原生目录选择 → 重启子进程（不带 session） | 对话框路径打通，cwd 跟随 |
| 文件树 | 一层一层懒加载，跳过隐藏文件与 `node_modules` | 展开 pi-dsk 根目录，目录/文件排序正确 |
| 文件预览 | 读文本，400KB 截断，二进制文件给提示 | `package.json` 预览正常 |
| 终端 | node-pty + xterm.js，独立真 shell，cwd 跟随工作区 | `echo TERM_OK` 回显，zsh 登录会话正常 |
| 设置抽屉 | 模型 / 思考级别 / pi 路径 / shell / 工作区 / 会话文件 / 打开会话目录 | 全部字段有值且可点 |

## 过程中修掉的问题

1. **重启子进程的竞态**：`restart()` 里旧进程的 `exit` 事件在新进程已就位后才到达，把 `this.child` 清成 null，之后所有命令返回「pi 进程未启动」。改为所有回调先比对子进程身份（`isCurrent()`），并加了回归测试。
2. **node-pty 无法 spawn**：npm 解包丢了 `prebuilds/darwin-arm64/spawn-helper` 的可执行位，`posix_spawnp failed`。新增 `scripts/fix-node-pty.mjs` 挂到 `postinstall` 修权限。
3. **会话索引把无 header 的坏文件当成会话**：时间戳退化成 mtime 后排序错乱，改为跳过无 `session` header 的文件。

## 未做（进 M3）

- 审批卡片（`extension_ui_request` 的 confirm/select/input）
- 亮/暗主题切换、CSP、打包 dmg
- 多窗口 / 多工作区并行
