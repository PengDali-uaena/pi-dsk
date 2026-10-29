import { useSession } from '../../store/session'

export function PreviewPanel(): React.JSX.Element {
  const preview = useSession((state) => state.preview)
  const closePreview = useSession((state) => state.closePreview)

  if (!preview) return <div className="sidebar-empty">点击左侧文件预览</div>

  return (
    <div className="preview">
      <div className="preview-head">
        <span className="preview-path" title={preview.path}>
          {preview.path.split('/').pop()}
        </span>
        <button type="button" className="btn btn-ghost" onClick={closePreview}>
          ×
        </button>
      </div>
      {preview.binary ? (
        <div className="sidebar-empty">二进制文件，无法预览</div>
      ) : (
        <pre className="preview-body">
          {preview.text}
          {preview.truncated ? '\n\n… 文件过大，仅显示前 400KB' : ''}
        </pre>
      )}
    </div>
  )
}
