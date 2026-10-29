import { useState } from 'react'
import type { ChatItem } from '@shared/chat-reducer'

type ToolItem = Extract<ChatItem, { kind: 'tool' }>

interface Props {
  item: ToolItem
}

export function ToolCard({ item }: Props): React.JSX.Element {
  const [open, setOpen] = useState(item.status === 'error')
  const summary = summarize(item.args)

  return (
    <div className={`tool-card tool-${item.status}`}>
      <button type="button" className="tool-head" onClick={() => setOpen(!open)}>
        <span className="tool-caret">{open ? '▾' : '▸'}</span>
        <span className="tool-name">{item.toolName}</span>
        {summary ? <span className="tool-summary">{summary}</span> : null}
        <span className="tool-tail">
          {item.status === 'running' ? <span className="spinner">运行中</span> : null}
          {item.status === 'error' ? <span className="tool-error">失败</span> : null}
          {item.durationMs !== undefined ? <span className="tool-duration">{formatDuration(item.durationMs)}</span> : null}
        </span>
      </button>
      {open ? <pre className="tool-output">{item.output || '（无输出）'}</pre> : null}
    </div>
  )
}

function summarize(args: unknown): string {
  if (!args || typeof args !== 'object') return ''
  const entries = Object.entries(args as Record<string, unknown>)
  if (entries.length === 0) return ''
  const [key, value] = entries[0]
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const short = text.length > 96 ? `${text.slice(0, 96)}…` : text
  return `${key}: ${short}`.replace(/\s+/g, ' ')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
