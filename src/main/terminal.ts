import { ipcMain, type BrowserWindow } from 'electron'
import { spawn, type IPty } from 'node-pty'
import { TERMINAL_IPC } from '../shared/protocol.js'

let pty: IPty | null = null

/** 右栏终端：独立的真 shell，不走 pi 子进程，也不进模型上下文。 */
export function registerTerminalIpc(getWindow: () => BrowserWindow | null, defaultCwd: () => string): void {
  const send = (channel: string, payload: unknown): void => {
    const window = getWindow()
    if (window && !window.isDestroyed()) window.webContents.send(channel, payload)
  }

  const kill = (): void => {
    if (!pty) return
    try {
      pty.kill()
    } catch {
      // 已经退出
    }
    pty = null
  }

  ipcMain.handle(TERMINAL_IPC.start, (_event, cwd: unknown) => {
    kill()
    const shell = process.env.SHELL || '/bin/zsh'
    pty = spawn(shell, ['-il'], {
      name: 'xterm-256color',
      cwd: typeof cwd === 'string' && cwd ? cwd : defaultCwd(),
      env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
      cols: 100,
      rows: 28
    })
    pty.onData((data) => send(TERMINAL_IPC.data, data))
    pty.onExit(({ exitCode }) => {
      pty = null
      send(TERMINAL_IPC.exit, exitCode)
    })
    return true
  })

  ipcMain.handle(TERMINAL_IPC.input, (_event, data: unknown) => {
    if (pty && typeof data === 'string') pty.write(data)
    return true
  })

  ipcMain.handle(TERMINAL_IPC.resize, (_event, size: unknown) => {
    const value = size as { cols?: number; rows?: number } | undefined
    if (pty && value?.cols && value?.rows) pty.resize(Math.max(2, value.cols), Math.max(2, value.rows))
    return true
  })

  ipcMain.handle(TERMINAL_IPC.kill, () => {
    kill()
    return true
  })
}
