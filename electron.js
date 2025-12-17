
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';
const dbFilePath = path.join(__dirname, 'data', 'items.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // In development, load from Vite dev server
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // In production, load the built HTML file
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.handle('get-db-data', () => {
    try {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading database file:', error);
      return null;
    }
  });

  ipcMain.handle('export-db', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Database',
      defaultPath: 'pillars-db-export.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });

    if (filePath) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
      } catch (error) {
        console.error('Error exporting database:', error);
        return { success: false, error };
      }
    }
    return { success: false, cancelled: true };
  });

  ipcMain.handle('import-db', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Database',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (filePaths && filePaths.length > 0) {
      const filePath = filePaths[0];
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        fs.writeFileSync(dbFilePath, JSON.stringify(jsonData, null, 2));
        event.sender.send('db-updated', jsonData);
        return { success: true, data: jsonData };
      } catch (error) {
        console.error('Error importing database:', error);
        return { success: false, error };
      }
    }
    return { success: false, cancelled: true };
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
