import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { DESKTOP_IPC, IPC, TERMINAL_IPC, type PiApi } from '../shared/protocol.js'

const api: PiApi = {
  command: (command) => ipcRenderer.invoke(IPC.command, command),
  getStatus: () => ipcRenderer.invoke(IPC.statusGet),
  desktop: {
    listSessions: () => ipcRenderer.invoke(DESKTOP_IPC.listSessions),
    openSession: (path) => ipcRenderer.invoke(DESKTOP_IPC.openSession, path),
    pickWorkspace: () => ipcRenderer.invoke(DESKTOP_IPC.pickWorkspace),
    listDirectory: (path) => ipcRenderer.invoke(DESKTOP_IPC.listDirectory, path),
    appInfo: () => ipcRenderer.invoke(DESKTOP_IPC.appInfo),
    openPath: (path) => ipcRenderer.invoke(DESKTOP_IPC.openPath, path),
    readFile: (path) => ipcRenderer.invoke(DESKTOP_IPC.readFile, path)
  },
  terminal: {
    start: (cwd) => ipcRenderer.invoke(TERMINAL_IPC.start, cwd),
    input: (data) => ipcRenderer.invoke(TERMINAL_IPC.input, data),
    resize: (cols, rows) => ipcRenderer.invoke(TERMINAL_IPC.resize, { cols, rows }),
    kill: () => ipcRenderer.invoke(TERMINAL_IPC.kill),
    onData: (listener) => {
      const handler = (_event: IpcRendererEvent, data: string): void => listener(data)
      ipcRenderer.on(TERMINAL_IPC.data, handler)
      return () => {
        ipcRenderer.off(TERMINAL_IPC.data, handler)
      }
    },
    onExit: (listener) => {
      const handler = (_event: IpcRendererEvent, code: number): void => listener(code)
      ipcRenderer.on(TERMINAL_IPC.exit, handler)
      return () => {
        ipcRenderer.off(TERMINAL_IPC.exit, handler)
      }
    }
  },
  onEvent: (listener) => {
    const handler = (_event: IpcRendererEvent, payload: Parameters<typeof listener>[0]): void => listener(payload)
    ipcRenderer.on(IPC.event, handler)
    return () => {
      ipcRenderer.off(IPC.event, handler)
    }
  },
  onStatus: (listener) => {
    const handler = (_event: IpcRendererEvent, payload: Parameters<typeof listener>[0]): void => listener(payload)
    ipcRenderer.on(IPC.status, handler)
    return () => {
      ipcRenderer.off(IPC.status, handler)
    }
  }
}

contextBridge.exposeInMainWorld('pi', api)
