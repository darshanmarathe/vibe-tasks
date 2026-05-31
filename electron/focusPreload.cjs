const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getTheme:       ()        => ipcRenderer.invoke('theme:get'),
  onThemeChanged: (cb)      => {
    ipcRenderer.on('theme:changed', (_event, t) => cb(t))
  },
  close:          ()        => ipcRenderer.invoke('focus:close'),
  minimize:       ()        => ipcRenderer.invoke('focus:minimize'),
  stopTimer:      ()        => ipcRenderer.invoke('time:stopRunning'),
  getRunning:     ()        => ipcRenderer.invoke('time:running'),
  getTotalToday:  (date)    => ipcRenderer.invoke('time:totalToday', date),
  onTimerUpdate:  (cb)      => {
    ipcRenderer.on('focus:timerUpdate', (_event, entry) => cb(entry))
  },
})
