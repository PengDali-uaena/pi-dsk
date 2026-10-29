import { useSession } from '../../store/session'

export function SessionSidebar(): React.JSX.Element {
  const cwd = useSession((state) => state.cwd)
  const sessionId = useSession((state) => state.sessionId)
  const running = useSession((state) => state.running)
  const newSession = useSession((state) => state.newSession)

  return (
    <aside className="sidebar sidebar-left">
      <div className="sidebar-head">
        <span className="brand">Pi Desktop</span>
        <button type="button" className="btn btn-ghost" onClick={() => void newSession()}>
          +
        </button>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-label">工作区</div>
        <div className="sidebar-value" title={cwd ?? ''}>
          {cwd ?? '未连接'}
        </div>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-label">当前会话</div>
        <div className="sidebar-value">{sessionId ? sessionId.slice(0, 12) : '—'}</div>
        <div className="sidebar-label">{running ? '运行中' : '空闲'}</div>
      </div>
      <div className="sidebar-foot">会话列表与历史搜索将在 M2 接入</div>
    </aside>
  )
}
