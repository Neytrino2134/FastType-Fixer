import { ipcRenderer } from 'electron';

// Since contextIsolation is false, we attach directly to window
window.electron = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
};