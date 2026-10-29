import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

export interface SessionSummary {
  id: string
  path: string
  cwd: string
  title: string
  timestamp: string
  updatedAt: number
}

interface CacheEntry {
  mtimeMs: number
  summary: SessionSummary
}

const cache = new Map<string, CacheEntry>()
const MAX_SCAN_LINES = 400

/** Pi 默认的会话根目录，可用 PI_CODING_AGENT_SESSION_DIR 覆盖。 */
export function defaultSessionRoot(): string {
  return process.env.PI_CODING_AGENT_SESSION_DIR ?? join(homedir(), '.pi', 'agent', 'sessions')
}

/** 扫 ~/.pi/agent/sessions 下的 jsonl，取 header 与首条 user 消息作标题。 */
export async function listSessions(root = defaultSessionRoot()): Promise<SessionSummary[]> {
  let directories: string[]
  try {
    const entries = await readdir(root, { withFileTypes: true })
    directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return []
  }

  const summaries: SessionSummary[] = []
  for (const directory of directories) {
    const directoryPath = join(root, directory)
    let files: string[]
    try {
      files = (await readdir(directoryPath)).filter((name) => name.endsWith('.jsonl'))
    } catch {
      continue
    }
    for (const file of files) {
      const path = join(directoryPath, file)
      const summary = await readSummary(path)
      if (summary) summaries.push(summary)
    }
  }

  summaries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
  return summaries
}

async function readSummary(path: string): Promise<SessionSummary | null> {
  try {
    const info = await stat(path)
    const cached = cache.get(path)
    if (cached && cached.mtimeMs === info.mtimeMs) return cached.summary

    const text = await readFile(path, 'utf8')
    const lines = text.split('\n')
    let header: any = null
    let title = ''
    for (let index = 0; index < Math.min(lines.length, MAX_SCAN_LINES); index += 1) {
      const line = lines[index]
      if (!line.trim()) continue
      let record: any
      try {
        record = JSON.parse(line)
      } catch {
        continue
      }
      if (!header && record.type === 'session') header = record
      if (!title && record.type === 'message' && record.message?.role === 'user') {
        title = extractText(record.message.content)
        if (title) break
      }
    }

    // 没有 session header 的文件不是会话（例如写坏的残留），直接跳过。
    if (!header) return null

    const summary: SessionSummary = {
      id: String(header.id ?? basename(path, '.jsonl')),
      path,
      cwd: String(header?.cwd ?? ''),
      title: title || basename(path, '.jsonl'),
      timestamp: String(header.timestamp ?? new Date(info.mtimeMs).toISOString()),
      updatedAt: info.mtimeMs
    }
    cache.set(path, { mtimeMs: info.mtimeMs, summary })
    return summary
  } catch {
    return null
  }
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return squash(content)
  if (!Array.isArray(content)) return ''
  const text = content
    .map((block: any) => (block?.type === 'text' ? String(block.text ?? '') : ''))
    .join(' ')
  return squash(text)
}

function squash(text: string): string {
  const single = text.replace(/\s+/g, ' ').trim()
  return single.length > 90 ? `${single.slice(0, 90)}…` : single
}
