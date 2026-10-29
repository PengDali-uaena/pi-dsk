## pi-dsk v0.0.1

Pi Agent 的桌面图形界面第一版。界面结构与功能分层对标 DeepSeek Harness 桌面端，agent 能力完全复用本机安装的 `pi`。

### 包含

- 三栏布局：左会话列表 / 中对话 / 右文件树、预览、终端
- 流式对话：markdown、reasoning 折叠块、工具调用卡片（参数、耗时、输出、失败高亮）、usage
- 运行控制：发送、steering 排队、中断、模型与 thinking 级别切换、`/` 命令补全
- 历史会话：直读 `~/.pi/agent/sessions` 建索引，点开即按该会话 `cwd` 重启 pi 并 `--session` 续上
- 工作区切换、文件预览、node-pty 真终端
- 扩展 UI：`select` / `confirm` / `input` / `editor` 对话框，`notify` / `setStatus` / `setWidget` / `setTitle` / `set_editor_text` 呈现
- 暗 / 亮主题

### 安装

下载下面的 `Pi Desktop-0.0.1-arm64.dmg`，拖进「应用程序」。

包未签名，首次打开需要右键 →「打开」，或在「系统设置 → 隐私与安全性」里放行。

### 前置条件

本机需已安装并登录 Pi CLI（`pi --version` 有输出）。

### 已知限制

- 仅 macOS arm64 构建，未签名，使用 Electron 默认图标
- 一个窗口一个 pi 子进程，没有多窗口并行
- 无自动更新

### 文档

设计稿、实施计划与各阶段验收记录都在仓库的 `docs/` 下。
