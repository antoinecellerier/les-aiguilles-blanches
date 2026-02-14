const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API so the game can detect desktop mode and control the window
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  quit: () => ipcRenderer.send('quit'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.sendSync('is-fullscreen'),
  setDisplayMode: (mode) => ipcRenderer.send('set-display-mode', mode),
  setBackgroundAudio: (enabled) => ipcRenderer.send('set-background-throttling', enabled),
});
