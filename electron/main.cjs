const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  IPC_CHANNELS,
  VALID_DISPLAY_MODES,
  DEFAULT_DISPLAY_MODE,
  WINDOW_CONFIG,
  CONFIG_FILENAME,
  F11_DEBOUNCE_MS,
} = require('./constants.cjs');

const iconPath = path.join(__dirname, 'icon.png');

// Persist display mode to a file so we can read it before window creation
const configPath = path.join(app.getPath('userData'), CONFIG_FILENAME);

function readSavedMode() {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (VALID_DISPLAY_MODES.includes(data.mode)) return data.mode;
  } catch (err) {
    // First launch, file missing, or corrupt JSON — use default
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to read display config: ${err.message}`);
    }
  }
  return DEFAULT_DISPLAY_MODE;
}

function saveModeToFile(mode) {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ mode }));
  } catch (err) {
    console.error(`Failed to save display mode: ${err.message}`);
  }
}

// Quit when the game requests it
ipcMain.on(IPC_CHANNELS.QUIT, () => app.quit());

// Window state
let mainWin = null;
let fullscreenTarget = false;
let savedMode = readSavedMode(); // user's preference from settings
let isRecreating = false;

// Fullscreen IPC — transient toggle, doesn't change saved preference
ipcMain.on(IPC_CHANNELS.TOGGLE_FULLSCREEN, () => {
  if (!mainWin) return;
  if (mainWin.isFullScreen()) {
    fullscreenTarget = false;
    mainWin.setFullScreen(false);
  } else {
    fullscreenTarget = true;
    mainWin.setFullScreen(true);
  }
});
ipcMain.on(IPC_CHANNELS.IS_FULLSCREEN, (event) => {
  event.returnValue = mainWin ? mainWin.isFullScreen() : false;
});

// Display mode IPC — used by settings, persists preference
ipcMain.on(IPC_CHANNELS.SET_DISPLAY_MODE, (_event, mode) => {
  applyDisplayMode(mode);
});

function applyDisplayMode(mode) {
  if (!mainWin) return;
  const needsFrame = mode === 'windowed';
  const hadFrame = savedMode === 'windowed';
  savedMode = mode;
  saveModeToFile(mode);

  // Frame change requires window recreation
  if (needsFrame !== hadFrame) {
    recreateWindow(needsFrame);
    if (mode === 'fullscreen') {
      fullscreenTarget = true;
      mainWin.setFullScreen(true);
    }
    return;
  }

  switch (mode) {
    case 'fullscreen':
      fullscreenTarget = true;
      mainWin.setFullScreen(true);
      break;
    case 'windowed':
      fullscreenTarget = false;
      mainWin.setFullScreen(false);
      mainWin.setBounds({
        width: WINDOW_CONFIG.DEFAULT_WIDTH,
        height: WINDOW_CONFIG.DEFAULT_HEIGHT,
      });
      mainWin.center();
      break;
    case 'borderless':
    default:
      fullscreenTarget = false;
      mainWin.setFullScreen(false);
      break;
  }
}

function recreateWindow(frame) {
  isRecreating = true;
  const bounds = mainWin.getBounds();
  mainWin.close();
  createWindow({ frame, bounds });
}

function createWindow(opts = {}) {
  const frame = opts.frame !== undefined ? opts.frame : (savedMode === 'windowed');
  const bounds = opts.bounds || {
    width: WINDOW_CONFIG.DEFAULT_WIDTH,
    height: WINDOW_CONFIG.DEFAULT_HEIGHT,
  };

  // Load icon with fallback
  let icon;
  try {
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      console.warn(`Icon not found at ${iconPath}, using default`);
    }
  } catch (err) {
    console.error(`Failed to load icon: ${err.message}`);
  }

  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: WINDOW_CONFIG.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MIN_HEIGHT,
    title: WINDOW_CONFIG.TITLE,
    backgroundColor: WINDOW_CONFIG.BG_COLOR,
    frame,
    show: false,
    icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });
  mainWin = win;
  isRecreating = false;

  win.once('ready-to-show', () => {
    win.show();
    if (savedMode === 'fullscreen') {
      fullscreenTarget = true;
      win.setFullScreen(true);
    }
  });

  // Load the built game from dist/
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // F11 toggles fullscreen transiently — doesn't change saved display mode
  let f11Ready = true;
  let f11Timer = null;
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.key !== 'F11' || input.type !== 'keyDown') return;
    if (input.isAutoRepeat || !f11Ready) return;
    f11Ready = false;
    fullscreenTarget = !fullscreenTarget;
    win.setFullScreen(fullscreenTarget);
    
    // Clear any pending timer before setting new one
    if (f11Timer) clearTimeout(f11Timer);
    f11Timer = setTimeout(() => {
      f11Ready = true;
      f11Timer = null;
    }, F11_DEBOUNCE_MS);
  });

  // Clean up timer on window close
  win.on('close', () => {
    if (f11Timer) {
      clearTimeout(f11Timer);
      f11Timer = null;
    }
  });
}

app.setName('Les Aiguilles Blanches');

app.whenReady().then(() => createWindow());

app.on('window-all-closed', () => {
  if (!isRecreating) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
