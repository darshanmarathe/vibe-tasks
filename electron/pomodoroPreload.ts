import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title: string, body: string) => ipcRenderer.invoke('pomodoro:notify', title, body),
  getSoundPath: () => ipcRenderer.invoke('pomodoro:soundPath'),
})
