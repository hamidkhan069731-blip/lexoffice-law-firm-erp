// electron/main.js
// Boots the same Express server used for the web version, then opens a
// native desktop window pointed at it. This is what turns the app into
// a proper double-click desktop program (Windows .exe / macOS .app /
// Linux AppImage) instead of "open a browser tab".

const { app, BrowserWindow } = require('electron');
const path = require('path');

const PORT = process.env.PORT || 4000;

function startBackend() {
  // Point the backend's data folder at Electron's per-user app data
  // directory, so the SQLite database survives app updates and isn't
  // buried inside the (read-only, on macOS) installed app bundle.
  process.env.PORT = String(PORT);
  process.env.LEXOFFICE_DATA_DIR = path.join(app.getPath('userData'), 'data');

  // In dev (`npm start` inside electron/) backend/ is a sibling folder.
  // In a packaged build it's copied next to the app as an "extraResource"
  // (see package.json -> build.extraResources), so it lives under
  // process.resourcesPath instead.
  const backendRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', 'backend');

  require(path.join(backendRoot, 'server.js'));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'LexOffice — Law Firm Management System',
    backgroundColor: '#0f1f3d',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 400); // small delay so Express is listening first
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
