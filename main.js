const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  powerMonitor,
} = require("electron");
const path = require("path");
const { WINDOW_WIDTH, WINDOW_HEIGHT } = require("./config/constants");
const { supabase } = require("./database/supabase");
const userManager = require("./services/userManager");
const sessionManager = require("./services/sessionManager");
const statsManager = require("./services/statsManager");
const userStatus = {
  user: "d7e419b4-93c3-4541-9acf-f50376e3c0d1",
  online_at: new Date().toISOString(),
};

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

app.whenReady().then(async () => {
  ipcMain.handle("show-notification", handleShowNotification);
  ipcMain.handle("get-user-stats", async () => {
    const stats = await statsManager.getUserData(userStatus.user);
    if (!stats || !stats.user) {
      return {
        username: "Not logged in",
        is_online: false,
        daily_score: 0,
        scores: {
          today: 0,
          week: 0,
          month: 0,
          year: 0,
        },
        hours: {
          today: 0,
          week: 0,
          month: 0,
          year: 0,
        },
      };
    }

    return {
      username: stats.user.username,
      is_online: stats.user.is_online,
      daily_score: await statsManager.getUserDailyScore(userStatus.user),
      scores: stats.scores,
      hours: stats.hours,
    };
  });

  // Create or get user first
  const user = await userManager.createOrGetUser("user-1");
  if (user) {
    userStatus.user = user.id; // Use the UUID from the database

    const onlineUsers = await statsManager.getOnlineUsers();
    console.log("Currently online users:", onlineUsers);

    // Start initial session with proper UUID
    const session = await sessionManager.startSession(user.id, "app_session");
    currentSession = session;

    // Get and log user daily score
    const dailyScore = await statsManager.getUserDailyScore(user.id);
    console.log("User daily score:", dailyScore);

    // Get all stats of user
    const stats = await statsManager.getUserData(user.id);
    console.log("User statistics:", stats);

    // Only create window after we have user data
    createWindow();
  }
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
