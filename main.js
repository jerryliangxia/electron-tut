const {
  app,
  BrowserWindow,
  Notification,
  ipcMain,
  powerMonitor,
} = require("electron");
const path = require("path");
const {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  IDLE_THRESHOLD,
  MULTIPLIER_INCREMENT,
  MULTIPLIER_MAX,
} = require("./config/constants");
const { supabase } = require("./database/supabase");
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
// Store the current session ID
let currentSessionId = null;

let currentSession = null;

// Function to calculate session score
function calculateSessionScore(durationMinutes, multiplier) {
  return durationMinutes * multiplier;
}

// Function to calculate multiplier based on duration
function calculateMultiplier(durationMinutes) {
  const multiplier =
    1 + Math.floor(durationMinutes / 60) * MULTIPLIER_INCREMENT;
  return Math.min(multiplier, MULTIPLIER_MAX);
}

// Function to update user online status
async function updateUserOnlineStatus(userId, isOnline) {
  const { error } = await supabase
    .from("users")
    .update({ is_online: isOnline })
    .eq("id", userId);

  if (error) console.error("Error updating user online status:", error);
}

// Function to start a new session
async function startSession(userId, sessionType) {
  // Start transaction by updating user status first
  await updateUserOnlineStatus(userId, true);

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      session_type: sessionType,
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) console.error("Error starting session:", error);
  return data;
}

// Function to end session
async function endSession(sessionId) {
  const endTime = new Date();
  const session = currentSession;

  if (!session) return;

  // Update user status first
  await updateUserOnlineStatus(session.user_id, false);

  const durationMinutes = Math.floor(
    (endTime - new Date(session.start_time)) / 1000 / 60
  );
  const multiplier = calculateMultiplier(durationMinutes);
  const score = calculateSessionScore(durationMinutes, multiplier);

  const { error } = await supabase
    .from("sessions")
    .update({
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      multiplier: multiplier,
      score: score,
    })
    .eq("id", sessionId);

  if (error) console.error("Error ending session:", error);
  currentSession = null;
}

// Function to update session duration
async function updateSessionDuration(sessionId, startTime) {
  const now = new Date();
  const durationMinutes = Math.floor((now - new Date(startTime)) / 1000 / 60);
  const multiplier = calculateMultiplier(durationMinutes);
  const score = calculateSessionScore(durationMinutes, multiplier);

  const { error } = await supabase
    .from("sessions")
    .update({
      duration_minutes: durationMinutes,
      multiplier: multiplier,
      score: score,
    })
    .eq("id", sessionId);

  if (error) console.error("Error updating session duration:", error);
}

// Function to check and handle idle state
function checkIdleState() {
  const idleState = powerMonitor.getSystemIdleState(IDLE_THRESHOLD);
  const now = Date.now();

  if (currentSession) {
    // Update duration periodically even if not idle
    updateSessionDuration(currentSession.id, currentSession.start_time);
  }

  if (idleState === "idle" && currentSession) {
    // If user became idle, end the current session
    endSession(currentSession.id);
  } else if (idleState === "active" && !currentSession) {
    // If user became active and there's no current session, start a new one
    startSession(userStatus.user, "app_session").then((session) => {
      currentSession = session;
    });
  }

  lastActiveTime = now;
}

// Set up idle checking interval
setInterval(checkIdleState, 60000); // Check every minute

// Modify existing power monitor listeners
powerMonitor.addListener("lock-screen", async () => {
  console.log("lock-screen");
  if (currentSession) {
    await endSession(currentSession.id);
  }
});

powerMonitor.addListener("unlock-screen", async () => {
  console.log("unlock-screen");
  const session = await startSession(userStatus.user, "screen_session");
  currentSession = session;
});

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

async function createOrGetUser(username) {
  // Try to get existing user
  let { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  // If user doesn't exist, create new one
  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({ username: username })
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return null;
    }
    user = newUser;
  }

  return user;
}

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
  const user = await createOrGetUser("user-1");
  if (user) {
    userStatus.user = user.id; // Use the UUID from the database

    const onlineUsers = await getOnlineUsers();
    console.log("Currently online users:", onlineUsers);

    // Start initial session with proper UUID
    const session = await startSession(user.id, "app_session");
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

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Add these event listeners for app quit
app.on("before-quit", async (event) => {
  if (currentSession) {
    event.preventDefault();
    await endSession(currentSession.id);
    app.quit();
  }
});

app.on("window-all-closed", (e) => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
