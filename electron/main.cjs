const { app, BrowserWindow, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// PipeWire/PulseAudio stream name and icon are hardcoded to "Chromium" in
// Chromium's pulse_util.cc. No workaround exists until Electron merges
// https://github.com/electron/electron/pull/49270

const iconPath = path.join(__dirname, 'icon.png');

// Persist display mode to a file so we can read it before window creation
const configPath = path.join(app.getPath('userData'), 'display.json');
const VALID_MODES = ['windowed', 'fullscreen', 'borderless'];

function readSavedMode() {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (VALID_MODES.includes(data.mode)) return data.mode;
  } catch (err) {
    // First launch, file missing, or corrupt JSON — use default
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to read display config: ${err.message}`);
    }
  }
  return 'windowed';
}

function saveModeToFile(mode) {
  try {
    fs.writeFileSync(configPath, JSON.stringify({ mode }));
  } catch (err) {
    console.error(`Failed to save display mode: ${err.message}`);
  }
}

// Quit when the game requests it
ipcMain.on('quit', () => app.quit());

// Window state
let mainWin = null;
let fullscreenTarget = false;
let savedMode = readSavedMode(); // user's preference from settings
let isRecreating = false;
let backgroundAudioEnabled = true; // default: audio continues when unfocused

// Fullscreen IPC — transient toggle, doesn't change saved preference
ipcMain.on('toggle-fullscreen', () => {
  if (!mainWin) return;
  if (mainWin.isFullScreen()) {
    fullscreenTarget = false;
    mainWin.setFullScreen(false);
  } else {
    fullscreenTarget = true;
    mainWin.setFullScreen(true);
  }
});
ipcMain.on('is-fullscreen', (event) => {
  event.returnValue = mainWin ? mainWin.isFullScreen() : false;
});

// Display mode IPC — used by settings, persists preference
ipcMain.on('set-display-mode', (_event, mode) => {
  applyDisplayMode(mode);
});

// Background audio IPC — controls whether audio continues when window loses focus
ipcMain.on('set-background-throttling', (_event, enabled) => {
  backgroundAudioEnabled = enabled;
  if (mainWin) {
    mainWin.webContents.setBackgroundThrottling(!enabled);
  }
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
        width: 1280,
        height: 720,
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
    width: 1280,
    height: 720,
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
    minWidth: 800,
    minHeight: 500,
    title: 'Les Aiguilles Blanches',
    backgroundColor: '#1a2a3e',
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

  // Load the built game — dev: ../dist/, packaged: resources/dist/
  const distPath = app.isPackaged
    ? path.join(process.resourcesPath, 'dist', 'index.html')
    : path.join(__dirname, '..', 'dist', 'index.html');
  win.loadFile(distPath);

  // Apply background audio setting (persisted across window recreations)
  win.webContents.setBackgroundThrottling(!backgroundAudioEnabled);

  // Open external links (e.g. GitHub) in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

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
    }, 300);
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

// Install .desktop file and icon for Wayland/GNOME taskbar integration.
// Uses xdg-utils (pre-installed on all freedesktop.org-compliant desktops).
// Idempotent — safe to run on every launch; overwrites stale entries.
function installDesktopIntegration() {
  if (process.platform !== 'linux' || !app.isPackaged) return;
  const { execFileSync } = require('child_process');
  try {
    const appImagePath = process.env.APPIMAGE || process.execPath;

    // Install pre-generated icons at all sizes
    const iconsDir = path.join(__dirname, 'icons');
    if (!fs.existsSync(iconsDir)) return;
    const sizes = [16, 32, 48, 64, 128, 256, 512];
    const tmpIcons = [];

    for (const size of sizes) {
      const src = path.join(iconsDir, `${size}.png`);
      if (!fs.existsSync(src)) continue;
      const tmpPath = path.join(app.getPath('temp'), `les-aiguilles-blanches-${size}.png`);
      fs.copyFileSync(src, tmpPath);
      tmpIcons.push(tmpPath);
      execFileSync('xdg-icon-resource', [
        'install', '--noupdate', '--novendor', '--size', String(size), tmpPath, 'les-aiguilles-blanches'
      ]);
    }
    execFileSync('xdg-icon-resource', ['forceupdate']);

    // Create and install .desktop file via xdg-desktop-menu
    const tmpDesktop = path.join(app.getPath('temp'), 'les-aiguilles-blanches.desktop');
    fs.writeFileSync(tmpDesktop, `[Desktop Entry]
Name=Les Aiguilles Blanches
Exec="${appImagePath}" --no-sandbox %U
Terminal=false
Type=Application
Icon=les-aiguilles-blanches
StartupWMClass=Les Aiguilles Blanches
Categories=Game;
Comment=Snow groomer simulation
`);
    execFileSync('xdg-desktop-menu', ['install', '--novendor', tmpDesktop]);

    // Clean up temp files
    for (const tmp of tmpIcons) {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
    try { fs.unlinkSync(tmpDesktop); } catch (_) {}
  } catch (err) {
    console.warn(`Desktop integration failed: ${err.message}`);
  }
}

app.whenReady().then(() => {
  installDesktopIntegration();
  createWindow();
});

app.on('window-all-closed', () => {
  if (!isRecreating) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
