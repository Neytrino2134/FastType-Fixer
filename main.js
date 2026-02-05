import { app, BrowserWindow, session, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 500,
    minHeight: 400,
    backgroundColor: '#0f172a', // Match slate-900
    frame: false, // Turn off native frame for custom controls
    titleBarStyle: 'hidden', // Required for macOS consistency
    webPreferences: {
      nodeIntegration: true, // Enabled as requested
      contextIsolation: false, // Disabled as requested
      sandbox: false, // Required for ESM preload scripts in some environments
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  // In development, load the Vite dev server
  // In production, load the built index.html
  const isDev = process.env.npm_lifecycle_event === 'electron:dev';

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Handle permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'audioCapture'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // IPC Event Handlers - Global registration
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.on('window-toggle-always-on-top', (event, flag) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setAlwaysOnTop(flag, 'screen-saver');
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});