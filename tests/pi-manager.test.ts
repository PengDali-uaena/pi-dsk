import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { PiManager } from '../src/main/pi-manager'

function fakeSpawn() {
  const child: any = new EventEmitter()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.stdin = new PassThrough()
  child.kill = vi.fn()
  const written: string[] = []
  child.stdin.on('data', (chunk: Buffer) => written.push(chunk.toString('utf8')))
  const spawnFn = vi.fn(() => child) as any
  return { child, spawnFn, written }
}

describe('PiManager', () => {
  it('命令带 id 写入 stdin，response 按 id resolve', async () => {
    const { child, spawnFn, written } = fakeSpawn()
    const manager = new PiManager({ spawnFn })
    manager.start()

    const pending = manager.request({ type: 'get_state' })
    await vi.waitFor(() => expect(written).toHaveLength(1))
    const payload = JSON.parse(written[0])
    expect(payload).toMatchObject({ type: 'get_state', id: '1' })

    child.stdout.write(JSON.stringify({ id: '1', type: 'response', command: 'get_state', success: true, data: { sessionId: 's1' } }) + '\n')
    await expect(pending).resolves.toMatchObject({ success: true, data: { sessionId: 's1' } })
  })

  it('非 response 记录作为事件抛出', async () => {
    const { child, spawnFn } = fakeSpawn()
    const manager = new PiManager({ spawnFn })
    const events: any[] = []
    manager.on('event', (event) => events.push(event))
    manager.start()

    child.stdout.write('{"type":"agent_start"}\n{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"hi"}}\n')
    await vi.waitFor(() => expect(events).toHaveLength(2))
    expect(events[0]).toEqual({ type: 'agent_start' })
    expect(events[1].assistantMessageEvent.delta).toBe('hi')
  })

  it('进程退出时 reject 未完成的请求', async () => {
    const { child, spawnFn } = fakeSpawn()
    const manager = new PiManager({ spawnFn })
    manager.start()

    const pending = manager.request({ type: 'get_state' })
    child.emit('exit', 1, null)
    await expect(pending).rejects.toThrow(/pi 进程已退出/)
  })

  it('未启动时请求直接失败', async () => {
    const manager = new PiManager({ spawnFn: fakeSpawn().spawnFn })
    await expect(manager.request({ type: 'abort' })).rejects.toThrow(/pi 进程未启动/)
  })
})
