const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");

// Define constants for window dimensions
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 600;

// Function to show notification
function handleShowNotification(event) {
  const NOTIFICATION_TITLE = "Basic Notification";
  const NOTIFICATION_BODY = "Notification from the Main process";

  const notification = new Notification({
    title: NOTIFICATION_TITLE,
    body: NOTIFICATION_BODY,
  });

  notification.show();

  // Send a message to the renderer process when the notification is clicked
  notification.on("click", () => {
    event.sender.send("notification-clicked");
  });
}

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

app.whenReady().then(() => {
  ipcMain.handle("show-notification", handleShowNotification);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
