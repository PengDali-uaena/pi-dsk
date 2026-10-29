import { useEffect } from 'react'
import { ChatFlow } from '../features/chat/ChatFlow'
import { Composer } from '../features/composer/Composer'
import { SessionSidebar } from '../features/sidebar-left/SessionSidebar'
import { ContextSidebar } from '../features/sidebar-right/ContextSidebar'
import { useSession } from '../store/session'

export function AppFrame(): React.JSX.Element {
  const init = useSession((state) => state.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="app">
      <SessionSidebar />
      <main className="stage">
        <TopBar />
        <ChatFlow />
        <Composer />
      </main>
      <ContextSidebar />
    </div>
  )
}

function TopBar(): React.JSX.Element {
  const sessionName = useSession((state) => state.sessionName)
  const sessionId = useSession((state) => state.sessionId)
  const model = useSession((state) => state.model)
  const thinkingLevel = useSession((state) => state.thinkingLevel)
  const connected = useSession((state) => state.connected)

  return (
    <header className="topbar">
      <div className="topbar-title">{sessionName ?? (sessionId ? `会话 ${sessionId.slice(0, 8)}` : '新会话')}</div>
      <div className="topbar-meta">
        <span className={`dot ${connected ? 'dot-on' : 'dot-off'}`} />
        <span>{model ? model.name : '无模型'}</span>
        {thinkingLevel ? <span className="chip">thinking {thinkingLevel}</span> : null}
      </div>
    </header>
  )
}
