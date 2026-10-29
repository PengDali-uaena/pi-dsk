import { create } from 'zustand'
import { itemsFromMessages, reduceChat, type ChatItem } from '@shared/chat-reducer'
import type {
  CommandInfo,
  FilePreviewInfo,
  ModelInfo,
  PiCommand,
  PiEvent,
  PiResponse,
  SessionSummaryInfo
} from '@shared/protocol'

interface QueueState {
  steering: number
  followUp: number
}

export interface SessionStore {
  items: ChatItem[]
  liveId: string | null
  running: boolean
  queue: QueueState
  connected: boolean
  statusMessage: string | null
  sessionName: string | null
  sessionId: string | null
  cwd: string | null
  model: ModelInfo | null
  models: ModelInfo[]
  thinkingLevel: string | null
  thinkingLevels: string[]
  commands: CommandInfo[]
  error: string | null
  ready: boolean
  sessions: SessionSummaryInfo[]
  sessionFile: string | null
  preview: FilePreviewInfo | null
  previewError: string | null

  init: () => void
  refresh: () => Promise<void>
  sendPrompt: (text: string) => Promise<void>
  abort: () => Promise<void>
  switchModel: (key: string) => Promise<void>
  switchThinking: (level: string) => Promise<void>
  newSession: () => Promise<void>
  dismissError: () => void
  refreshSessions: () => Promise<void>
  openSession: (path: string) => Promise<void>
  pickWorkspace: () => Promise<void>
  openFile: (path: string) => Promise<void>
  closePreview: () => void
}

let subscribed = false

async function call(command: PiCommand): Promise<PiResponse> {
  return window.pi.command(command)
}

export const useSession = create<SessionStore>((set, get) => ({
  items: [],
  liveId: null,
  running: false,
  queue: { steering: 0, followUp: 0 },
  connected: false,
  statusMessage: null,
  sessionName: null,
  sessionId: null,
  cwd: null,
  model: null,
  models: [],
  thinkingLevel: null,
  thinkingLevels: [],
  commands: [],
  error: null,
  ready: false,
  sessions: [],
  sessionFile: null,
  preview: null,
  previewError: null,

  init: () => {
    if (subscribed) return
    subscribed = true

    window.pi.onEvent((event: PiEvent) => {
      const state = get()
      const chat = reduceChat(
        { items: state.items, liveId: state.liveId, running: state.running, queue: state.queue },
        event
      )
      const patch: Partial<SessionStore> = {
        items: chat.items,
        liveId: chat.liveId,
        running: chat.running,
        queue: chat.queue
      }
      if (event.type === 'thinking_level_changed' && typeof event.level === 'string') {
        patch.thinkingLevel = event.level
      }
      if (event.type === 'session_info_changed') {
        patch.sessionName = typeof event.name === 'string' ? event.name : null
      }
      set(patch as SessionStore)
      if (event.type === 'agent_settled') void get().refreshSessions()
    })

    window.pi.onStatus((status) => {
      if (status.state === 'ready') {
        set({ connected: true, statusMessage: null, cwd: status.cwd ?? null })
        void get().refresh()
        void get().refreshSessions()
        return
      }
      if (status.state === 'starting') {
        set({ connected: false, statusMessage: 'pi 进程启动中…' })
        return
      }
      set({
        connected: false,
        statusMessage: status.message ? `pi 进程已退出：${status.message}` : 'pi 进程已退出',
        running: false
      })
    })

    void window.pi.getStatus().then((status) => {
      if (status.state === 'ready') set({ connected: true, cwd: status.cwd ?? null })
      if (status.state === 'exited') set({ statusMessage: status.message ?? null })
    })

    void get().refresh()
    void get().refreshSessions()
  },

  refreshSessions: async () => {
    const sessions = await window.pi.desktop.listSessions()
    set({ sessions })
  },

  openSession: async (path: string) => {
    const result = await window.pi.desktop.openSession(path)
    if (!result.ok) {
      set({ error: result.error ?? '打开会话失败' })
      return
    }
    set({ items: [], liveId: null, running: false, preview: null, previewError: null })
  },

  pickWorkspace: async () => {
    const result = await window.pi.desktop.pickWorkspace()
    if (!result.ok) return
    set({ items: [], liveId: null, running: false, preview: null, previewError: null, cwd: result.cwd ?? null })
  },

  openFile: async (path: string) => {
    try {
      const preview = await window.pi.desktop.readFile(path)
      set({ preview, previewError: null })
    } catch (error) {
      set({ preview: null, previewError: error instanceof Error ? error.message : String(error) })
    }
  },

  closePreview: () => set({ preview: null, previewError: null }),

  refresh: async () => {
    const state = await call({ type: 'get_state' })
    if (state.success) {
      set({
        sessionId: state.data?.sessionId ?? null,
        sessionName: state.data?.sessionName ?? null,
        sessionFile: state.data?.sessionFile ?? null,
        model: state.data?.model ?? null,
        thinkingLevel: state.data?.thinkingLevel ?? null,
        running: Boolean(state.data?.isStreaming),
        connected: true
      })
    }

    const messages = await call({ type: 'get_messages' })
    if (messages.success) set({ items: itemsFromMessages(messages.data?.messages) })

    const models = await call({ type: 'get_available_models' })
    if (models.success) set({ models: models.data?.models ?? [] })

    const levels = await call({ type: 'get_available_thinking_levels' })
    if (levels.success) set({ thinkingLevels: levels.data?.levels ?? [] })

    const commands = await call({ type: 'get_commands' })
    if (commands.success) set({ commands: commands.data?.commands ?? [] })

    set({ ready: true })
  },

  sendPrompt: async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const command: PiCommand = { type: 'prompt', message: trimmed }
    if (get().running) command.streamingBehavior = 'steer'
    const response = await call(command)
    if (!response.success) set({ error: response.error ?? '发送失败' })
  },

  abort: async () => {
    const response = await call({ type: 'abort' })
    if (!response.success) set({ error: response.error ?? '中断失败' })
  },

  switchModel: async (key: string) => {
    const [provider, ...rest] = key.split(':')
    const response = await call({ type: 'set_model', provider, modelId: rest.join(':') })
    if (response.success) {
      set({ model: response.data ?? get().model })
      const levels = await call({ type: 'get_available_thinking_levels' })
      if (levels.success) set({ thinkingLevels: levels.data?.levels ?? [] })
    } else {
      set({ error: response.error ?? '切换模型失败' })
    }
  },

  switchThinking: async (level: string) => {
    const response = await call({ type: 'set_thinking_level', level })
    if (response.success) set({ thinkingLevel: level })
    else set({ error: response.error ?? '切换思考级别失败' })
  },

  newSession: async () => {
    const response = await call({ type: 'new_session' })
    if (response.success) {
      set({ items: [], liveId: null, running: false, queue: { steering: 0, followUp: 0 } })
      await get().refresh()
    } else {
      set({ error: response.error ?? '新建会话失败' })
    }
  },

  dismissError: () => set({ error: null })
}))
