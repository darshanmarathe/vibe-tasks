const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title, body) => ipcRenderer.invoke('pomodoro:notify', title, body),
  close: () => ipcRenderer.invoke('pomodoro:close'),
  minimize: () => ipcRenderer.invoke('pomodoro:minimize'),
  getSoundPath: () => ipcRenderer.invoke('pomodoro:soundPath'),
})
