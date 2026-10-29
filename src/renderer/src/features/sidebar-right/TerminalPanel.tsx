import { useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useSession } from '../../store/session'

export function TerminalPanel(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const cwd = useSession((state) => state.cwd)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const terminal = new Terminal({
      fontSize: 11.5,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      cursorBlink: true,
      theme: { background: '#14161a', foreground: '#e6e8ec', cursor: '#4f8cff' }
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(host)
    fit.fit()

    const offData = window.pi.terminal.onData((data) => terminal.write(data))
    const offExit = window.pi.terminal.onExit((code) => terminal.write(`\r\n[进程已退出：${code}]\r\n`))
    const disposable = terminal.onData((data) => void window.pi.terminal.input(data))

    void window.pi.terminal.start(cwd ?? '')

    const observer = new ResizeObserver(() => {
      try {
        fit.fit()
        void window.pi.terminal.resize(terminal.cols, terminal.rows)
      } catch {
        // 面板不可见时忽略
      }
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
      offData()
      offExit()
      disposable.dispose()
      terminal.dispose()
      void window.pi.terminal.kill()
    }
  }, [cwd])

  return <div className="terminal-host" ref={hostRef} />
}
