import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import { registerDesktopIpc } from './desktop-ipc.js'
import { registerTerminalIpc } from './terminal.js'
import { attachManager, registerIpc } from './ipc.js'
import { PiManager } from './pi-manager.js'

const preloadPath = fileURLToPath(new URL('../preload/index.mjs', import.meta.url))
const rendererEntry = fileURLToPath(new URL('../renderer/index.html', import.meta.url))

let mainWindow: BrowserWindow | null = null
const manager = new PiManager()

function createWindow(onLoaded?: () => void): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Pi Desktop',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#14161a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  if (onLoaded) mainWindow.webContents.once('did-finish-load', onLoaded)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(rendererEntry)
  }
}

app.whenReady().then(() => {
  registerIpc(manager)
  registerDesktopIpc(manager, () => mainWindow)
  registerTerminalIpc(() => mainWindow, () => manager.workdir)
  const resendStatus = attachManager(manager, () => mainWindow)
  manager.on('warning', (message: string) => console.error('[pi]', message))
  manager.on('exit', (payload: { code: number | null; stderr?: string }) =>
    console.error('[pi] exited', payload.code, payload.stderr?.slice(-600))
  )
  manager.start()
  createWindow(resendStatus)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(resendStatus)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => manager.dispose())
