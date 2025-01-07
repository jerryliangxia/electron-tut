const { app, BrowserWindow, powerMonitor } = require("electron");
const path = require("path");
const { WINDOW_WIDTH, WINDOW_HEIGHT } = require("./config/constants");

const sessionManager = require("./services/sessionManager");
const { setupIpcHandlers } = require("./ipc/handlers");

const createWindow = () => {
  const { width } = require("electron").screen.getPrimaryDisplay().workAreaSize;

  const onlineStatusWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: width - WINDOW_WIDTH, // Position at the right edge
    y: 0, // Position at the top
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hidden",
  });

  onlineStatusWindow.loadFile("index.html");
};

app.whenReady().then(async () => {
  await setupIpcHandlers();
  createWindow();
});

// For SessionManager
powerMonitor.addListener("lock-screen", async () => {
  await sessionManager.handleLockScreen();
});

powerMonitor.addListener("unlock-screen", async () => {
  await sessionManager.handleUnlockScreen();
});

app.on("before-quit", async (event) => {
  await sessionManager.handleAppQuit(event);
});

// Don't do anything for MacOS
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", (e) => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
