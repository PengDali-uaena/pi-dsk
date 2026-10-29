import { ipcMain, type BrowserWindow } from 'electron'
import type { ExtensionUiResponse, PiCommand, PiStatus } from '../shared/protocol.js'
import { IPC } from '../shared/protocol.js'
import { PiManager } from './pi-manager.js'

let lastStatus: PiStatus = { state: 'starting' }

/** 把主进程的 pi 子进程转发给渲染进程。 */
export function registerIpc(manager: PiManager): void {
  ipcMain.handle(IPC.command, async (_event, command: PiCommand) => {
    try {
      return await manager.request(command)
    } catch (error) {
      return {
        type: 'response',
        command: command?.type ?? 'unknown',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  ipcMain.handle(IPC.statusGet, () => lastStatus)

  ipcMain.handle(IPC.extensionResponse, (_event, response: ExtensionUiResponse) =>
    manager.sendRaw({ ...response, type: 'extension_ui_response' })
  )
}

/**
 * 绑定子进程事件到窗口。返回的 sync 用于窗口加载完成后补发当前状态，
 * 避免渲染进程错过启动前的事件。
 */
export function attachManager(manager: PiManager, getWindow: () => BrowserWindow | null): () => void {
  const send = (channel: string, payload: unknown): void => {
    const window = getWindow()
    if (window && !window.isDestroyed()) window.webContents.send(channel, payload)
  }

  const status = (value: PiStatus): void => {
    lastStatus = value
    send(IPC.status, value)
  }

  manager.on('started', () => status({ state: 'ready', cwd: manager.workdir }))
  manager.on('event', (event) => send(IPC.event, event))
  manager.on('warning', (message: string) => send(IPC.event, { type: 'dsk_warning', message }))
  manager.on('exit', (payload: { code: number | null; stderr?: string }) =>
    status({ state: 'exited', code: payload.code, message: payload.stderr?.slice(-800) })
  )

  return () => send(IPC.status, lastStatus)
}
