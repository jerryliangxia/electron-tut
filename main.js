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

const userStatus = {
  user: "d7e419b4-93c3-4541-9acf-f50376e3c0d1",
  online_at: new Date().toISOString(),
};

async function getOnlineUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("is_online", true);

  if (error) {
    console.error("Error fetching online users:", error);
    return [];
  }
  return data;
}
// Function to get complete user data
async function getUserData(userId) {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.setDate(1));
  const startOfYear = new Date(now.setMonth(0, 1));

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      score,
      duration_minutes,
      start_time,
      users (
        id,
        username,
        is_online
      )
    `
    )
    .eq("user_id", userId)
    .gte("start_time", startOfYear.toISOString());

  if (error) {
    console.error("Error fetching user data:", error);
    return null;
  }

  const stats = {
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
    user: data[0]?.users || null,
  };

  data.forEach((session) => {
    const sessionStart = new Date(session.start_time);
    const score = session.score || 0;
    const minutes = session.duration_minutes || 0;

    // Accumulate scores
    stats.scores.year += score;
    if (sessionStart >= startOfMonth) stats.scores.month += score;
    if (sessionStart >= startOfWeek) stats.scores.week += score;
    if (sessionStart >= startOfDay) stats.scores.today += score;

    // Accumulate hours
    stats.hours.year += minutes;
    if (sessionStart >= startOfMonth) stats.hours.month += minutes;
    if (sessionStart >= startOfWeek) stats.hours.week += minutes;
    if (sessionStart >= startOfDay) stats.hours.today += minutes;
  });

  // Convert minutes to hours and round everything
  return {
    user: stats.user,
    scores: {
      today: Math.round(stats.scores.today * 100) / 100,
      week: Math.round(stats.scores.week * 100) / 100,
      month: Math.round(stats.scores.month * 100) / 100,
      year: Math.round(stats.scores.year * 100) / 100,
    },
    hours: {
      today: Math.round((stats.hours.today / 60) * 100) / 100,
      week: Math.round((stats.hours.week / 60) * 100) / 100,
      month: Math.round((stats.hours.month / 60) * 100) / 100,
      year: Math.round((stats.hours.year / 60) * 100) / 100,
    },
  };
}

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

// Function to get user's daily score
async function getUserDailyScore(userId) {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));

  const { data, error } = await supabase
    .from("sessions")
    .select("score")
    .eq("user_id", userId)
    .gte("start_time", startOfDay.toISOString());

  if (error) {
    console.error("Error fetching user daily score:", error);
    return null;
  }

  const dailyScore = data.reduce(
    (total, session) => total + (session.score || 0),
    0
  );
  return Math.round(dailyScore * 100) / 100;
}

app.whenReady().then(async () => {
  ipcMain.handle("show-notification", handleShowNotification);
  ipcMain.handle("get-user-stats", async () => {
    const stats = await getUserData(userStatus.user);
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
      daily_score: await getUserDailyScore(userStatus.user),
      scores: stats.scores,
      hours: stats.hours,
    };
  });

  // Create or get user first
  const user = await userManager.createOrGetUser("user-1");
  if (user) {
    userStatus.user = user.id; // Use the UUID from the database

    const onlineUsers = await getOnlineUsers();
    console.log("Currently online users:", onlineUsers);

    // Start initial session with proper UUID
    const session = await sessionManager.startSession(user.id, "app_session");
    currentSession = session;

    // Get and log user daily score
    const dailyScore = await getUserDailyScore(user.id);
    console.log("User daily score:", dailyScore);

    // Get all stats of user
    const stats = await getUserData(user.id);
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
