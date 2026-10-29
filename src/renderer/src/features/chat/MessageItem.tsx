import type { ChatItem } from '@shared/chat-reducer'
import { Markdown } from './Markdown'
import { ReasoningBlock } from './ReasoningBlock'
import { ToolCard } from './ToolCard'

interface Props {
  item: ChatItem
}

export function MessageItem({ item }: Props): React.JSX.Element {
  if (item.kind === 'user') {
    return (
      <article className="row row-user">
        <div className="bubble bubble-user">{item.text}</div>
      </article>
    )
  }

  if (item.kind === 'notice') {
    return (
      <article className={`notice ${item.level === 'error' ? 'notice-error' : ''}`}>
        <span>{item.text}</span>
      </article>
    )
  }

  if (item.kind === 'tool') {
    return (
      <article className="row">
        <ToolCard item={item} />
      </article>
    )
  }

  return (
    <article className="row row-assistant">
      <div className="assistant-body">
        {item.blocks.map((block, index) => {
          if (block.type === 'text') return <Markdown key={index} text={block.text} />
          if (block.type === 'thinking') return <ReasoningBlock key={index} text={block.text} />
          // 工具调用由 tool_execution_* 事件渲染成独立卡片，这里不重复展示
          return null
        })}
        {item.errorMessage ? <div className="error-line">{item.errorMessage}</div> : null}
        {item.usage?.totalTokens ? (
          <div className="usage-line">
            {item.usage.input ?? 0} in / {item.usage.output ?? 0} out
            {item.usage.cost ? ` · $${item.usage.cost.toFixed(4)}` : ''}
          </div>
        ) : null}
      </div>
    </article>
  )
}
