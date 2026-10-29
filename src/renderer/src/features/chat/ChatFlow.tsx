import { useEffect, useRef } from 'react'
import { useSession } from '../../store/session'
import { MessageItem } from './MessageItem'

export function ChatFlow(): React.JSX.Element {
  const items = useSession((state) => state.items)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !pinnedRef.current) return
    element.scrollTop = element.scrollHeight
  }, [items])

  const onScroll = (): void => {
    const element = scrollRef.current
    if (!element) return
    pinnedRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
  }

  return (
    <div className="chat-flow" ref={scrollRef} onScroll={onScroll}>
      {items.length === 0 ? (
        <div className="empty-state">
          <h1>Pi Desktop</h1>
          <p>输入一句话开始。Enter 发送，Shift+Enter 换行。</p>
        </div>
      ) : (
        items.map((item) => <MessageItem key={item.id} item={item} />)
      )}
      <div className="chat-flow-tail" />
    </div>
  )
}
