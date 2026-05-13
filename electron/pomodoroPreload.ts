import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title: string, body: string) => ipcRenderer.invoke('pomodoro:notify', title, body),
  getSoundPath: () => ipcRenderer.invoke('pomodoro:soundPath'),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChanged: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme:changed', (_event, theme) => callback(theme))
  },
})
