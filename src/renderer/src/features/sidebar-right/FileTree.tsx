import { useEffect, useState } from 'react'
import type { FileEntryInfo } from '@shared/protocol'
import { useSession } from '../../store/session'

interface Props {
  onOpen: () => void
}

export function FileTree({ onOpen }: Props): React.JSX.Element {
  const cwd = useSession((state) => state.cwd)
  const openFile = useSession((state) => state.openFile)

  if (!cwd) return <div className="sidebar-empty">未选择工作区</div>

  return (
    <div className="file-tree">
      <Directory path={cwd} depth={0} onOpen={onOpen} openFile={openFile} />
    </div>
  )
}

interface DirectoryProps {
  path: string
  depth: number
  onOpen: () => void
  openFile: (path: string) => Promise<void>
}

function Directory({ path, depth, onOpen, openFile }: DirectoryProps): React.JSX.Element {
  const [entries, setEntries] = useState<FileEntryInfo[] | null>(null)

  useEffect(() => {
    if (entries) return
    let cancelled = false
    void window.pi.desktop.listDirectory(path).then((result) => {
      if (!cancelled) setEntries(result)
    })
    return () => {
      cancelled = true
    }
  }, [entries, path])

  return (
    <>
      {entries
        ? entries.map((entry) =>
            entry.isDirectory ? (
              <DirRow key={entry.path} entry={entry} depth={depth} onOpen={onOpen} openFile={openFile} />
            ) : (
              <button
                type="button"
                key={entry.path}
                className="file-row"
                style={{ paddingLeft: 8 + depth * 12 }}
                title={entry.path}
                onClick={() => {
                  void openFile(entry.path)
                  onOpen()
                }}
              >
                <span className="file-icon">·</span>
                {entry.name}
              </button>
            )
          )
        : null}
    </>
  )
}

function DirRow({ entry, depth, onOpen, openFile }: { entry: FileEntryInfo; depth: number; onOpen: () => void; openFile: (path: string) => Promise<void> }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="file-row file-row-dir" style={{ paddingLeft: 8 + depth * 12 }} onClick={() => setOpen(!open)}>
        <span className="file-icon">{open ? '▾' : '▸'}</span>
        {entry.name}
      </button>
      {open ? <Directory path={entry.path} depth={depth + 1} onOpen={onOpen} openFile={openFile} /> : null}
    </>
  )
}
