import { useState } from 'react'
import { useSession } from '../../store/session'
import { FileTree } from './FileTree'
import { PreviewPanel } from './PreviewPanel'
import { TerminalPanel } from './TerminalPanel'

type Tab = 'files' | 'preview' | 'terminal'

export function ContextSidebar(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('files')
  const preview = useSession((state) => state.preview)
  const error = useSession((state) => state.previewError)

  const showPreview = (): void => setTab('preview')

  return (
    <aside className="sidebar sidebar-right">
      <div className="sidebar-head">
        <span className="sidebar-tabs">
          <button type="button" className={tab === 'files' ? 'tab tab-active' : 'tab'} onClick={() => setTab('files')}>
            文件
          </button>
          <button type="button" className={tab === 'preview' ? 'tab tab-active' : 'tab'} onClick={showPreview}>
            预览
          </button>
          <button type="button" className={tab === 'terminal' ? 'tab tab-active' : 'tab'} onClick={() => setTab('terminal')}>
            终端
          </button>
        </span>
      </div>
      {tab === 'files' ? <FileTree onOpen={showPreview} /> : null}
      {tab === 'preview' ? <PreviewPanel /> : null}
      {tab === 'terminal' ? <TerminalPanel /> : null}
      {error ? <div className="sidebar-error">{error}</div> : null}
      {tab === 'files' && preview ? <div className="sidebar-foot">当前预览：{basename(preview.path)}</div> : null}
    </aside>
  )
}

function basename(path: string): string {
  return path.split('/').pop() ?? path
}
