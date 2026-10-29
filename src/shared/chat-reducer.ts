import type { PiEvent } from './protocol.js'

export type AssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'toolCall'; id: string; name: string; argsText: string }

export type ChatItem =
  | { kind: 'user'; id: string; text: string; images: string[] }
  | {
      kind: 'assistant'
      id: string
      blocks: AssistantBlock[]
      usage?: UsageSnapshot
      stopReason?: string
      errorMessage?: string
    }
  | {
      kind: 'tool'
      id: string
      toolCallId: string
      toolName: string
      args: unknown
      output: string
      isError: boolean
      durationMs?: number
      status: 'running' | 'ok' | 'error'
    }
  | { kind: 'notice'; id: string; text: string; level: 'info' | 'error' }

export interface UsageSnapshot {
  input?: number
  output?: number
  totalTokens?: number
  cost?: number
}

export interface ChatState {
  items: ChatItem[]
  liveId: string | null
  running: boolean
  queue: { steering: number; followUp: number }
}

let sequence = 0
const nextId = (prefix: string): string => `${prefix}-${++sequence}`

export function createChatState(): ChatState {
  return { items: [], liveId: null, running: false, queue: { steering: 0, followUp: 0 } }
}

/** 事件流 → 消息列表。纯函数，便于单测（见 tests/chat-reducer.test.ts）。 */
export function reduceChat(state: ChatState, event: PiEvent): ChatState {
  switch (event.type) {
    case 'agent_start':
      return { ...state, running: true }

    case 'agent_settled':
      return { ...state, running: false, liveId: null }

    case 'message_start': {
      const message = event.message ?? {}
      if (message.role !== 'assistant') return state
      const item: ChatItem = {
        kind: 'assistant',
        id: nextId('assistant'),
        blocks: blocksFromContent(message.content)
      }
      return { ...state, items: [...state.items, item], liveId: item.id }
    }

    case 'message_update': {
      if (!state.liveId) return state
      const update = event.assistantMessageEvent
      if (!update) return state
      const index = state.items.findIndex((item) => item.id === state.liveId)
      if (index < 0) return state
      const current = state.items[index] as Extract<ChatItem, { kind: 'assistant' }>
      const blocks = applyAssistantUpdate(current.blocks, update)
      const usage = event.usage ? usageFrom(event.usage) : current.usage
      const items = [...state.items]
      items[index] = { ...current, blocks, usage }
      return { ...state, items }
    }

    case 'message_end': {
      const message = event.message ?? {}
      if (message.role === 'user') {
        const item: ChatItem = {
          kind: 'user',
          id: nextId('user'),
          text: textOf(message.content),
          images: imageCount(message.content)
        }
        return { ...state, items: [...state.items, item] }
      }
      if (message.role !== 'assistant') return state
      const blocks = blocksFromContent(message.content)
      const index = state.items.findIndex((item) => item.id === state.liveId)
      if (index < 0) {
        const item: ChatItem = {
          kind: 'assistant',
          id: nextId('assistant'),
          blocks,
          stopReason: message.stopReason,
          errorMessage: message.errorMessage,
          usage: message.usage ? usageFrom(message.usage) : undefined
        }
        return { ...state, items: [...state.items, item], liveId: null }
      }
      const items = [...state.items]
      const current = items[index] as Extract<ChatItem, { kind: 'assistant' }>
      items[index] = {
        ...current,
        blocks,
        stopReason: message.stopReason,
        errorMessage: message.errorMessage,
        usage: message.usage ? usageFrom(message.usage) : current.usage
      }
      return { ...state, items, liveId: null }
    }

    case 'tool_execution_start': {
      const item: ChatItem = {
        kind: 'tool',
        id: nextId('tool'),
        toolCallId: String(event.toolCallId ?? ''),
        toolName: String(event.toolName ?? 'tool'),
        args: event.args,
        output: '',
        isError: false,
        status: 'running'
      }
      return { ...state, items: [...state.items, item] }
    }

    case 'tool_execution_update': {
      const index = findTool(state, String(event.toolCallId ?? ''))
      if (index < 0) return state
      const items = [...state.items]
      const current = items[index] as Extract<ChatItem, { kind: 'tool' }>
      items[index] = { ...current, output: textOf(event.partialResult?.content) }
      return { ...state, items }
    }

    case 'tool_execution_end': {
      const index = findTool(state, String(event.toolCallId ?? ''))
      if (index < 0) return state
      const items = [...state.items]
      const current = items[index] as Extract<ChatItem, { kind: 'tool' }>
      const isError = Boolean(event.isError)
      items[index] = {
        ...current,
        output: textOf(event.result?.content) || current.output,
        isError,
        status: isError ? 'error' : 'ok',
        durationMs: typeof event.durationMs === 'number' ? event.durationMs : current.durationMs
      }
      return { ...state, items }
    }

    case 'queue_update':
      return {
        ...state,
        queue: {
          steering: Array.isArray(event.steering) ? event.steering.length : 0,
          followUp: Array.isArray(event.followUp) ? event.followUp.length : 0
        }
      }

    case 'compaction_start':
      return {
        ...state,
        items: [
          ...state.items,
          { kind: 'notice', id: nextId('notice'), text: `上下文压缩中（${event.reason ?? 'auto'}）…`, level: 'info' }
        ]
      }

    case 'compaction_end':
      return {
        ...state,
        items: [
          ...state.items,
          {
            kind: 'notice',
            id: nextId('notice'),
            text: event.errorMessage ? `压缩失败：${event.errorMessage}` : '上下文已压缩',
            level: event.errorMessage ? 'error' : 'info'
          }
        ]
      }

    case 'extension_error':
      return {
        ...state,
        items: [
          ...state.items,
          {
            kind: 'notice',
            id: nextId('notice'),
            text: `扩展错误（${event.extensionPath ?? 'unknown'}）：${event.error ?? ''}`,
            level: 'error'
          }
        ]
      }

    case 'dsk_warning':
      return {
        ...state,
        items: [...state.items, { kind: 'notice', id: nextId('notice'), text: String(event.message ?? ''), level: 'error' }]
      }

    default:
      return state
  }
}

function findTool(state: ChatState, toolCallId: string): number {
  for (let index = state.items.length - 1; index >= 0; index -= 1) {
    const item = state.items[index]
    if (item.kind === 'tool' && item.toolCallId === toolCallId) return index
  }
  return -1
}

function applyAssistantUpdate(blocks: AssistantBlock[], update: any): AssistantBlock[] {
  const index = typeof update.contentIndex === 'number' ? update.contentIndex : 0
  const next = [...blocks]

  switch (update.type) {
    case 'text_start':
      next[index] = { type: 'text', text: '' }
      return next
    case 'text_delta': {
      const current = next[index]
      const text = current?.type === 'text' ? current.text : ''
      next[index] = { type: 'text', text: text + String(update.delta ?? '') }
      return next
    }
    case 'text_end':
      next[index] = { type: 'text', text: String(update.content ?? '') }
      return next
    case 'thinking_start':
      next[index] = { type: 'thinking', text: '' }
      return next
    case 'thinking_delta': {
      const current = next[index]
      const text = current?.type === 'thinking' ? current.text : ''
      next[index] = { type: 'thinking', text: text + String(update.delta ?? '') }
      return next
    }
    case 'thinking_end':
      next[index] = { type: 'thinking', text: String(update.content ?? '') }
      return next
    case 'toolcall_start':
      next[index] = { type: 'toolCall', id: String(update.id ?? ''), name: String(update.toolName ?? 'tool'), argsText: '' }
      return next
    case 'toolcall_delta': {
      const current = next[index]
      const argsText = current?.type === 'toolCall' ? current.argsText : ''
      next[index] = { type: 'toolCall', id: current?.type === 'toolCall' ? current.id : '', name: current?.type === 'toolCall' ? current.name : 'tool', argsText: argsText + String(update.delta ?? '') }
      return next
    }
    case 'toolcall_end': {
      const call = update.toolCall ?? {}
      next[index] = {
        type: 'toolCall',
        id: String(call.id ?? ''),
        name: String(call.name ?? 'tool'),
        argsText: JSON.stringify(call.arguments ?? {})
      }
      return next
    }
    default:
      return blocks
  }
}

export function blocksFromContent(content: unknown): AssistantBlock[] {
  if (!Array.isArray(content)) return []
  const blocks: AssistantBlock[] = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    const value = block as Record<string, any>
    if (value.type === 'text') blocks.push({ type: 'text', text: String(value.text ?? '') })
    else if (value.type === 'thinking') blocks.push({ type: 'thinking', text: String(value.thinking ?? '') })
    else if (value.type === 'toolCall')
      blocks.push({
        type: 'toolCall',
        id: String(value.id ?? ''),
        name: String(value.name ?? 'tool'),
        argsText: JSON.stringify(value.arguments ?? {})
      })
  }
  return blocks
}

export function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block: any) => (block && typeof block === 'object' && block.type === 'text' ? String(block.text ?? '') : ''))
    .filter((text) => text.length > 0)
    .join('\n')
}

function imageCount(content: unknown): string[] {
  if (!Array.isArray(content)) return []
  return content
    .filter((block: any) => block && typeof block === 'object' && block.type === 'image')
    .map((block: any) => String(block.mimeType ?? 'image'))
}

function usageFrom(usage: any): UsageSnapshot {
  return {
    input: usage?.input,
    output: usage?.output,
    totalTokens: usage?.totalTokens,
    cost: usage?.cost?.total
  }
}

/** 从 get_messages 的历史消息还原列表（首屏恢复用）。 */
export function itemsFromMessages(messages: unknown): ChatItem[] {
  if (!Array.isArray(messages)) return []
  const items: ChatItem[] = []
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue
    const value = message as Record<string, any>
    if (value.role === 'user') {
      items.push({ kind: 'user', id: nextId('user'), text: textOf(value.content), images: imageCount(value.content) })
    } else if (value.role === 'assistant') {
      items.push({
        kind: 'assistant',
        id: nextId('assistant'),
        blocks: blocksFromContent(value.content),
        usage: value.usage ? usageFrom(value.usage) : undefined,
        stopReason: value.stopReason,
        errorMessage: value.errorMessage
      })
    } else if (value.role === 'toolResult') {
      items.push({
        kind: 'tool',
        id: nextId('tool'),
        toolCallId: String(value.toolCallId ?? ''),
        toolName: String(value.toolName ?? 'tool'),
        args: undefined,
        output: textOf(value.content),
        isError: Boolean(value.isError),
        status: value.isError ? 'error' : 'ok'
      })
    }
  }
  return items
}
