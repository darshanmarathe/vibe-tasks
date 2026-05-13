const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (title, body) => ipcRenderer.invoke('pomodoro:notify', title, body),
  close: () => ipcRenderer.invoke('pomodoro:close'),
  minimize: () => ipcRenderer.invoke('pomodoro:minimize'),
  getSoundPath: () => ipcRenderer.invoke('pomodoro:soundPath'),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme:changed', (_event, theme) => callback(theme))
  },
})
