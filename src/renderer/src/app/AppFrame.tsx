import { useEffect, useState } from 'react'
import { ExtensionDialog } from '../features/approval/ExtensionDialog'
import { Toasts } from '../features/approval/Toasts'
import { ChatFlow } from '../features/chat/ChatFlow'
import { Composer } from '../features/composer/Composer'
import { SessionSidebar } from '../features/sidebar-left/SessionSidebar'
import { SettingsDrawer } from '../features/settings/SettingsDrawer'
import { ContextSidebar } from '../features/sidebar-right/ContextSidebar'
import { useSession } from '../store/session'

function StatusChips(): React.JSX.Element {
  const statuses = useSession((state) => state.statuses)
  const entries = Object.entries(statuses)
  if (entries.length === 0) return <></>
  return (
    <>
      {entries.map(([key, text]) => (
        <span key={key} className="chip">
          {text}
        </span>
      ))}
    </>
  )
}

export function AppFrame(): React.JSX.Element {
  const init = useSession((state) => state.init)
  const theme = useSession((state) => state.theme)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="app">
      <SessionSidebar />
      <main className="stage">
        <TopBar />
        <ChatFlow />
        <Composer />
      </main>
      <ContextSidebar />
      <ExtensionDialog />
      <Toasts />
    </div>
  )
}

function TopBar(): React.JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false)
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
        <StatusChips />
        <button type="button" className="btn btn-ghost" title="设置" onClick={() => setSettingsOpen(true)}>
          ⚙
        </button>
      </div>
      {settingsOpen ? <SettingsDrawer onClose={() => setSettingsOpen(false)} /> : null}
    </header>
  )
}
