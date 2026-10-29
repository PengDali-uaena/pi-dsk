import { useState } from 'react'

interface Props {
  text: string
}

export function ReasoningBlock({ text }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  if (!text.trim()) return <></>
  return (
    <div className="reasoning">
      <button type="button" className="reasoning-toggle" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} 思考过程
      </button>
      {open ? <pre className="reasoning-text">{text}</pre> : null}
    </div>
  )
}
