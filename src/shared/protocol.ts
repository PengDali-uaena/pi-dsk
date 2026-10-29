/**
 * RPC 命令与事件类型。事件字段以 Pi 的 docs/json.md 为准：
 * https://（本地）~/pi/.pi/agent/install/releases/<ver>/node_modules/@earendil-works/pi-coding-agent/docs/json.md
 * 这里刻意保持宽松（index signature），Pi 升级新增字段不会让编译失败。
 */

export const IPC = {
  command: 'pi:command',
  event: 'pi:event',
  status: 'pi:status',
  statusGet: 'pi:status:get'
} as const

export type PiCommandType =
  | 'prompt'
  | 'abort'
  | 'get_state'
  | 'get_messages'
  | 'get_available_models'
  | 'get_available_thinking_levels'
  | 'get_commands'
  | 'set_model'
  | 'set_thinking_level'
  | 'new_session'
  | 'compact'
  | 'set_session_name'

export interface PiCommand {
  type: PiCommandType
  [key: string]: unknown
}

export interface PiResponse {
  id?: number | string
  type: 'response'
  command: string
  success: boolean
  data?: any
  error?: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  reasoning?: boolean
  contextWindow?: number
  maxTokens?: number
}

export interface CommandInfo {
  name: string
  description?: string
  source: 'extension' | 'prompt' | 'skill'
}

export const DESKTOP_IPC = {
  listSessions: 'dsk:sessions:list',
  openSession: 'dsk:sessions:open',
  pickWorkspace: 'dsk:workspace:pick',
  listDirectory: 'dsk:fs:list',
  appInfo: 'dsk:app:info',
  openPath: 'dsk:app:openPath',
  readFile: 'dsk:fs:read'
} as const

export const TERMINAL_IPC = {
  start: 'dsk:term:start',
  input: 'dsk:term:input',
  resize: 'dsk:term:resize',
  kill: 'dsk:term:kill',
  data: 'dsk:term:data',
  exit: 'dsk:term:exit'
} as const

export interface TerminalApi {
  start: (cwd: string) => Promise<boolean>
  input: (data: string) => Promise<boolean>
  resize: (cols: number, rows: number) => Promise<boolean>
  kill: () => Promise<boolean>
  onData: (listener: (data: string) => void) => () => void
  onExit: (listener: (code: number) => void) => () => void
}

export interface SessionSummaryInfo {
  id: string
  path: string
  cwd: string
  title: string
  timestamp: string
  updatedAt: number
}

export interface FileEntryInfo {
  name: string
  path: string
  isDirectory: boolean
}

export interface FilePreviewInfo {
  path: string
  text: string
  truncated: boolean
  binary: boolean
}

export interface OpenSessionResult {
  ok: boolean
  cwd?: string
  error?: string
}

export interface AppInfo {
  piBinary: string
  sessionRoot: string
  shell: string
  cwd: string
}

export interface DesktopApi {
  appInfo: () => Promise<AppInfo>
  openPath: (path: string) => Promise<boolean>
  listSessions: () => Promise<SessionSummaryInfo[]>
  openSession: (path: string) => Promise<OpenSessionResult>
  pickWorkspace: () => Promise<OpenSessionResult>
  listDirectory: (path: string) => Promise<FileEntryInfo[]>
  readFile: (path: string) => Promise<FilePreviewInfo>
}

export type PiStatus =
  | { state: 'starting' }
  | { state: 'ready'; cwd?: string }
  | { state: 'exited'; code: number | null; message?: string }

/** 会话事件：结构见 Pi docs/json.md 的 Event sequence 一节。 */
export interface PiEvent {
  type: string
  [key: string]: any
}

export interface PiApi {
  command: (command: PiCommand) => Promise<PiResponse>
  desktop: DesktopApi
  terminal: TerminalApi
  getStatus: () => Promise<PiStatus>
  onEvent: (listener: (event: PiEvent) => void) => () => void
  onStatus: (listener: (status: PiStatus) => void) => () => void
}
