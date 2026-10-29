import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/protocol'
import { useSession } from '../../store/session'

export function SettingsDrawer({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const sessionFile = useSession((state) => state.sessionFile)
  const thinkingLevel = useSession((state) => state.thinkingLevel)
  const model = useSession((state) => state.model)

  useEffect(() => {
    let cancelled = false
    void window.pi.desktop.appInfo().then((value) => {
      if (!cancelled) setInfo(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <span>设置</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">模型</div>
          <div className="drawer-value">{model?.name ?? '—'}</div>
          <div className="drawer-label">思考级别</div>
          <div className="drawer-value">{thinkingLevel ?? '—'}</div>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">pi 可执行文件</div>
          <div className="drawer-value">{info?.piBinary ?? '…'}</div>
          <div className="drawer-label">shell</div>
          <div className="drawer-value">{info?.shell ?? '…'}</div>
          <div className="drawer-label">工作区</div>
          <div className="drawer-value">{info?.cwd ?? '…'}</div>
        </div>

        <div className="drawer-section">
          <div className="drawer-label">会话文件</div>
          <div className="drawer-value">{sessionFile ?? '尚未落盘'}</div>
          <button
            type="button"
            className="btn btn-tiny"
            onClick={() => void window.pi.desktop.openPath(info?.sessionRoot ?? '')}
          >
            打开会话目录
          </button>
        </div>

        <div className="drawer-foot">修改模型与思考级别在输入框下方；其余配置项在 M3 接入。</div>
      </div>
    </div>
  )
}
