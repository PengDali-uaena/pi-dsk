import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { listSessions } from '../src/main/session-index'

let root = ''

function sessionFile(id: string, cwd: string, timestamp: string, title: string): string {
  const header = { type: 'session', version: 3, id, timestamp, cwd }
  const user = {
    type: 'message',
    id: 'e1',
    parentId: null,
    timestamp,
    message: { role: 'user', content: [{ type: 'text', text: title }], timestamp: 1 }
  }
  return [JSON.stringify(header), JSON.stringify(user), ''].join('\n')
}

describe('listSessions', () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'pi-dsk-sessions-'))
    await mkdir(join(root, '--a--'), { recursive: true })
    await mkdir(join(root, '--b--'), { recursive: true })
    await writeFile(join(root, '--a--', 'old.jsonl'), sessionFile('id-old', '/a', '2024-01-01T00:00:00.000Z', '旧会话'))
    await writeFile(join(root, '--b--', 'new.jsonl'), sessionFile('id-new', '/b', '2024-06-01T00:00:00.000Z', '  \n 新会话\n标题  '))
    await writeFile(join(root, '--b--', 'broken.jsonl'), 'not json\n')
  })

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })

  it('按时间倒序排列并带出 cwd 与标题', async () => {
    const sessions = await listSessions(root)
    expect(sessions.map((entry) => entry.id)).toEqual(['id-new', 'id-old'])
    expect(sessions[0].cwd).toBe('/b')
    expect(sessions[0].title).toBe('新会话 标题')
  })

  it('没有 session header 的文件被跳过', async () => {
    const sessions = await listSessions(root)
    expect(sessions.some((entry) => entry.path.endsWith('broken.jsonl'))).toBe(false)
  })

  it('根目录不存在时返回空数组', async () => {
    await expect(listSessions(join(root, 'missing'))).resolves.toEqual([])
  })
})
