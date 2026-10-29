import { useSession } from '../../store/session'

export function SessionSidebar(): React.JSX.Element {
  const cwd = useSession((state) => state.cwd)
  const sessions = useSession((state) => state.sessions)
  const sessionFile = useSession((state) => state.sessionFile)
  const newSession = useSession((state) => state.newSession)
  const openSession = useSession((state) => state.openSession)
  const pickWorkspace = useSession((state) => state.pickWorkspace)
  const refreshSessions = useSession((state) => state.refreshSessions)

  return (
    <aside className="sidebar sidebar-left">
      <div className="sidebar-head">
        <span className="brand">Pi Desktop</span>
        <span className="sidebar-head-actions">
          <button type="button" className="btn btn-ghost" title="刷新会话列表" onClick={() => void refreshSessions()}>
            ↻
          </button>
          <button type="button" className="btn btn-ghost" title="新会话" onClick={() => void newSession()}>
            +
          </button>
        </span>
      </div>

      <div className="workspace-row">
        <div className="workspace-path" title={cwd ?? ''}>
          {cwd ? cwd.split('/').pop() : '未连接'}
        </div>
        <button type="button" className="btn btn-tiny" onClick={() => void pickWorkspace()}>
          切换
        </button>
      </div>

      <div className="session-list">
        {sessions.length === 0 ? <div className="sidebar-empty">没有历史会话</div> : null}
        {sessions.map((session) => (
          <button
            type="button"
            key={session.path}
            className={session.path === sessionFile ? 'session-item session-item-active' : 'session-item'}
            title={session.path}
            onClick={() => void openSession(session.path)}
          >
            <span className="session-title">{session.title}</span>
            <span className="session-meta">
              {session.cwd.split('/').pop() || '—'} · {relativeTime(session.timestamp)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

function relativeTime(timestamp: string): string {
  const value = Date.parse(timestamp)
  if (Number.isNaN(value)) return ''
  const minutes = Math.round((Date.now() - value) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(value).toLocaleDateString('zh-CN')
}
