import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../store/session'

/** 扩展对话框：select / confirm / input / editor，回写 extension_ui_response。 */
export function ExtensionDialog(): React.JSX.Element | null {
  const dialog = useSession((state) => state.dialog)
  const respondDialog = useSession((state) => state.respondDialog)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!dialog) return
    setValue(dialog.method === 'editor' ? (dialog.prefill ?? '') : '')
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(timer)
  }, [dialog])

  if (!dialog) return null

  const cancel = (): void => void respondDialog({ cancelled: true })

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (event.key === 'Enter' && (dialog.method === 'input' || dialog.method === 'editor') && !event.shiftKey) {
      event.preventDefault()
      void respondDialog({ value })
    }
  }

  return (
    <div className="dialog-backdrop" onKeyDown={onKeyDown}>
      <div className="dialog">
        <div className="dialog-title">{dialog.title ?? 'Pi 需要你的确认'}</div>
        {dialog.message ? <div className="dialog-message">{dialog.message}</div> : null}

        {dialog.method === 'select' ? (
          <div className="dialog-options">
            {(dialog.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                className="btn dialog-option"
                onClick={() => void respondDialog({ value: option })}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {dialog.method === 'confirm' ? (
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={() => void respondDialog({ confirmed: false })}>
              否
            </button>
            <button type="button" className="btn btn-send" onClick={() => void respondDialog({ confirmed: true })}>
              是
            </button>
          </div>
        ) : null}

        {dialog.method === 'input' ? (
          <div className="dialog-actions dialog-vertical">
            <input
              ref={(element) => {
                inputRef.current = element
              }}
              className="dialog-input"
              placeholder={dialog.placeholder ?? ''}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={cancel}>
                取消
              </button>
              <button type="button" className="btn btn-send" onClick={() => void respondDialog({ value })}>
                确定
              </button>
            </div>
          </div>
        ) : null}

        {dialog.method === 'editor' ? (
          <div className="dialog-actions dialog-vertical">
            <textarea
              ref={(element) => {
                inputRef.current = element
              }}
              className="dialog-input dialog-textarea"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={cancel}>
                取消
              </button>
              <button type="button" className="btn btn-send" onClick={() => void respondDialog({ value })}>
                保存
              </button>
            </div>
          </div>
        ) : null}

        {dialog.timeout ? <div className="dialog-hint">{Math.round(dialog.timeout / 1000)} 秒后自动取消</div> : null}
      </div>
    </div>
  )
}
