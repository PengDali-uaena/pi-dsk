import { describe, expect, it } from 'vitest'
import { createChatState, itemsFromMessages, reduceChat, type ChatState } from '../src/shared/chat-reducer'

function run(events: any[]): ChatState {
  return events.reduce((state, event) => reduceChat(state, event), createChatState())
}

const assistantStart = {
  type: 'message_start',
  message: { role: 'assistant', content: [], stopReason: 'pending' }
}

describe('reduceChat', () => {
  it('text_delta 累积，text_end 覆盖，message_end 整体替换', () => {
    const state = run([
      assistantStart,
      { type: 'message_update', assistantMessageEvent: { type: 'text_start', contentIndex: 0 } },
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'Hel' } },
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'lo' } }
    ])
    const live = state.items[0] as any
    expect(live.blocks[0].text).toBe('Hello')

    const afterEnd = reduceChat(state, {
      type: 'message_update',
      assistantMessageEvent: { type: 'text_end', contentIndex: 0, content: 'Hello world' }
    })
    expect((afterEnd.items[0] as any).blocks[0].text).toBe('Hello world')

    const final = reduceChat(afterEnd, {
      type: 'message_end',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'final text' }],
        stopReason: 'stop',
        usage: { input: 10, output: 5, totalTokens: 15, cost: { total: 0.01 } }
      }
    })
    const item = final.items[0] as any
    expect(item.blocks).toEqual([{ type: 'text', text: 'final text' }])
    expect(item.stopReason).toBe('stop')
    expect(item.usage).toMatchObject({ input: 10, output: 5, totalTokens: 15 })
    expect(final.liveId).toBeNull()
  })

  it('user 消息在 message_end 时入列，不重复', () => {
    const state = run([
      { type: 'message_start', message: { role: 'user', content: '你好' } },
      { type: 'message_end', message: { role: 'user', content: '你好' } }
    ])
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({ kind: 'user', text: '你好' })
  })

  it('工具事件按 toolCallId 聚合', () => {
    const state = run([
      { type: 'tool_execution_start', toolCallId: 'c1', toolName: 'bash', args: { command: 'ls' } },
      { type: 'tool_execution_update', toolCallId: 'c1', partialResult: { content: [{ type: 'text', text: 'partial' }] } },
      {
        type: 'tool_execution_end',
        toolCallId: 'c1',
        result: { content: [{ type: 'text', text: 'done' }] },
        isError: false,
        durationMs: 120
      }
    ])
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({
      kind: 'tool',
      toolName: 'bash',
      output: 'done',
      status: 'ok',
      durationMs: 120
    })
  })

  it('工具失败标记为 error', () => {
    const state = run([
      { type: 'tool_execution_start', toolCallId: 'c2', toolName: 'read', args: {} },
      { type: 'tool_execution_end', toolCallId: 'c2', result: { content: [] }, isError: true }
    ])
    expect(state.items[0]).toMatchObject({ status: 'error', isError: true })
  })

  it('乱序与未知事件不崩', () => {
    const state = run([
      { type: 'message_update', assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'x' } },
      { type: 'tool_execution_end', toolCallId: 'nope', result: {}, isError: false },
      { type: 'unknown_event', whatever: true }
    ])
    expect(state.items).toHaveLength(0)
  })

  it('agent_settled 结束运行态并清理 liveId', () => {
    const state = run([{ type: 'agent_start' }, assistantStart, { type: 'agent_settled', aborted: false }])
    expect(state.running).toBe(false)
    expect(state.liveId).toBeNull()
  })

  it('queue_update 记录排队数量', () => {
    const state = run([{ type: 'queue_update', steering: [{ text: 'a' }], followUp: [] }])
    expect(state.queue).toEqual({ steering: 1, followUp: 0 })
  })

  it('itemsFromMessages 还原历史', () => {
    const items = itemsFromMessages([
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '想一想' },
          { type: 'toolCall', id: 't1', name: 'bash', arguments: { command: 'ls' } }
        ]
      },
      { role: 'toolResult', toolCallId: 't1', toolName: 'bash', content: [{ type: 'text', text: 'out' }], isError: false }
    ])
    expect(items.map((item) => item.kind)).toEqual(['user', 'assistant', 'tool'])
  })
})
