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
  getStatus: () => Promise<PiStatus>
  onEvent: (listener: (event: PiEvent) => void) => () => void
  onStatus: (listener: (status: PiStatus) => void) => () => void
}
