const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbData: () => ipcRenderer.invoke('get-db-data'),
  exportDb: (data) => ipcRenderer.invoke('export-db', data),
  importDb: () => ipcRenderer.invoke('import-db'),
  onDbUpdate: (callback) => ipcRenderer.on('db-updated', (_event, value) => callback(value))
});
