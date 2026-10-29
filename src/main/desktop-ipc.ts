import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { DESKTOP_IPC, type OpenSessionResult } from '../shared/protocol.js'
import { PiManager } from './pi-manager.js'
import { defaultSessionRoot, listSessions } from './session-index.js'
import { listDirectory, readPreview } from './workspace-fs.js'

/** 桌面能力：会话索引、工作区选择、文件读取。不属于 pi RPC 协议。 */
export function registerDesktopIpc(manager: PiManager, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(DESKTOP_IPC.appInfo, () => ({
    piBinary: manager.binaryPath,
    sessionRoot: defaultSessionRoot(),
    shell: process.env.SHELL ?? '/bin/sh',
    cwd: manager.workdir
  }))

  ipcMain.handle(DESKTOP_IPC.openPath, async (_event, path: unknown) => {
    if (typeof path !== 'string' || !path) return false
    const result = await shell.openPath(path)
    return result === ''
  })

  ipcMain.handle(DESKTOP_IPC.listSessions, async () => {
    try {
      return await listSessions()
    } catch {
      return []
    }
  })

  ipcMain.handle(DESKTOP_IPC.openSession, async (_event, path: unknown): Promise<OpenSessionResult> => {
    if (typeof path !== 'string') return { ok: false, error: '会话路径无效' }
    const sessions = await listSessions()
    const session = sessions.find((entry) => entry.path === path)
    if (!session) return { ok: false, error: '会话不存在' }
    manager.restart({ cwd: session.cwd || undefined, sessionPath: session.path })
    return { ok: true, cwd: session.cwd }
  })

  ipcMain.handle(DESKTOP_IPC.pickWorkspace, async (): Promise<OpenSessionResult> => {
    const window = getWindow()
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'], title: '选择工作区' })
      : await dialog.showOpenDialog({ properties: ['openDirectory'], title: '选择工作区' })
    if (result.canceled || result.filePaths.length === 0) return { ok: false }
    const cwd = result.filePaths[0]
    manager.restart({ cwd })
    return { ok: true, cwd }
  })

  ipcMain.handle(DESKTOP_IPC.listDirectory, async (_event, path: unknown) => {
    if (typeof path !== 'string') return []
    try {
      return await listDirectory(path)
    } catch {
      return []
    }
  })

  ipcMain.handle(DESKTOP_IPC.readFile, async (_event, path: unknown) => {
    if (typeof path !== 'string') throw new Error('路径无效')
    return readPreview(path)
  })
}
