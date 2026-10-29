import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC, type PiApi } from '../shared/protocol.js'

const api: PiApi = {
  command: (command) => ipcRenderer.invoke(IPC.command, command),
  getStatus: () => ipcRenderer.invoke(IPC.statusGet),
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
