import { useEffect, useMemo, useRef, useState } from 'react'
import type { CommandInfo } from '@shared/protocol'
import { useSession } from '../../store/session'

export function Composer(): React.JSX.Element {
  const [text, setText] = useState('')
  const [highlight, setHighlight] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const running = useSession((state) => state.running)
  const connected = useSession((state) => state.connected)
  const queue = useSession((state) => state.queue)
  const error = useSession((state) => state.error)
  const model = useSession((state) => state.model)
  const models = useSession((state) => state.models)
  const thinkingLevel = useSession((state) => state.thinkingLevel)
  const thinkingLevels = useSession((state) => state.thinkingLevels)
  const commands = useSession((state) => state.commands)
  const sendPrompt = useSession((state) => state.sendPrompt)
  const abort = useSession((state) => state.abort)
  const switchModel = useSession((state) => state.switchModel)
  const switchThinking = useSession((state) => state.switchThinking)
  const dismissError = useSession((state) => state.dismissError)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`
  }, [text])

  const suggestions = useMemo(() => matchCommands(text, commands), [text, commands])

  useEffect(() => {
    setHighlight(0)
  }, [text])

  const submit = (): void => {
    if (!text.trim()) return
    void sendPrompt(text)
    setText('')
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlight((value) => (value + 1) % suggestions.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlight((value) => (value - 1 + suggestions.length) % suggestions.length)
        return
      }
      if ((event.key === 'Tab' || event.key === 'Enter') && !event.shiftKey) {
        event.preventDefault()
        setText(`/${suggestions[highlight].name} `)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setText('')
        return
      }
    }
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const queued = queue.steering + queue.followUp

  return (
    <div className="composer">
      {error ? (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" onClick={dismissError}>
            关闭
          </button>
        </div>
      ) : null}

      {queued > 0 ? (
        <div className="queue-chips">
          {queue.steering > 0 ? <span className="chip">排队指令 {queue.steering}</span> : null}
          {queue.followUp > 0 ? <span className="chip">后续消息 {queue.followUp}</span> : null}
        </div>
      ) : null}

      <div className="composer-box">
        {suggestions.length > 0 ? (
          <ul className="command-menu">
            {suggestions.map((command, index) => (
              <li
                key={command.name}
                className={index === highlight ? 'command-item command-item-active' : 'command-item'}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setText(`/${command.name} `)
                }}
              >
                <span className="command-name">/{command.name}</span>
                <span className="command-desc">{command.description ?? command.source}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder={connected ? '给 Pi 发消息，/ 触发命令…' : 'pi 进程未就绪'}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={!connected}
        />
        <div className="composer-actions">
          <div className="composer-selects">
            <select
              value={model ? `${model.provider}:${model.id}` : ''}
              onChange={(event) => void switchModel(event.target.value)}
              disabled={models.length === 0}
            >
              {model ? null : <option value="">选择模型</option>}
              {models.map((entry) => (
                <option key={`${entry.provider}:${entry.id}`} value={`${entry.provider}:${entry.id}`}>
                  {entry.name}
                </option>
              ))}
            </select>
            <select
              value={thinkingLevel ?? ''}
              onChange={(event) => void switchThinking(event.target.value)}
              disabled={thinkingLevels.length <= 1}
            >
              {thinkingLevels.map((level) => (
                <option key={level} value={level}>
                  thinking {level}
                </option>
              ))}
            </select>
          </div>
          {running ? (
            <button type="button" className="btn btn-stop" onClick={() => void abort()}>
              停止
            </button>
          ) : (
            <button type="button" className="btn btn-send" onClick={submit} disabled={!connected || !text.trim()}>
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** 只在输入以 / 开头且未换行时提示命令。 */
function matchCommands(text: string, commands: CommandInfo[]): CommandInfo[] {
  if (!text.startsWith('/') || text.includes('\n')) return []
  const query = text.slice(1).toLowerCase()
  if (query.includes(' ')) return []
  return commands
    .filter((command) => command.name.toLowerCase().includes(query))
    .slice(0, 8)
}
