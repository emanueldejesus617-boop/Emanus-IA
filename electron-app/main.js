const { app, BrowserWindow, shell, Menu, Tray, nativeImage, Notification } = require('electron');
const path = require('path');

// URL da Emanus IA publicada online
const EMANUS_URL = 'https://emanus-ia.vercel.app';

let mainWindow = null;
let tray = null;

// ─── Criar Janela Principal ─────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: 'Emanus IA',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0B0F17',
    show: false, // mostrar apenas depois de carregar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
  });

  // Carregar a Emanus IA
  mainWindow.loadURL(EMANUS_URL);

  // Mostrar janela depois de carregar (evita flash branco)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Abrir links externos no browser padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(EMANUS_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Fechar para o tray em vez de fechar a app
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// ─── Tray (ícone na barra do sistema) ───────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon-16.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Emanus IA',
      click: () => { mainWindow.show(); mainWindow.focus(); },
    },
    {
      label: 'Dashboard',
      click: () => { mainWindow.loadURL(`${EMANUS_URL}/dashboard`); mainWindow.show(); },
    },
    {
      label: 'Emanus Chat',
      click: () => { mainWindow.loadURL(`${EMANUS_URL}/dashboard/emanus`); mainWindow.show(); },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => { app.isQuiting = true; app.quit(); },
    },
  ]);

  tray.setToolTip('Emanus IA — O teu professor');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// ─── Menu da Aplicação ───────────────────────────────────────────────────────
function createMenu() {
  const template = [
    {
      label: 'Emanus IA',
      submenu: [
        { label: 'Dashboard', click: () => mainWindow.loadURL(`${EMANUS_URL}/dashboard`) },
        { label: 'Emanus Chat', click: () => mainWindow.loadURL(`${EMANUS_URL}/dashboard/emanus`) },
        { label: 'Aulas', click: () => mainWindow.loadURL(`${EMANUS_URL}/dashboard/lessons`) },
        { label: 'Simulados', click: () => mainWindow.loadURL(`${EMANUS_URL}/dashboard/exams`) },
        { label: 'Horário', click: () => mainWindow.loadURL(`${EMANUS_URL}/dashboard/schedule`) },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recarregar', role: 'reload' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Tamanho original', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Ecrã Inteiro', role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── App Events ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Garantir instância única
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

