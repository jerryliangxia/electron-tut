const { ipcMain } = require("electron");
const statsManager = require("../services/statsManager");
const userManager = require("../services/userManager");
const sessionManager = require("../services/sessionManager");

const userStatus = {
  user: "fa775f64-340a-422a-a665-6e18cdd6b4b8",
  online_at: new Date().toISOString(),
};

async function setupIpcHandlers() {
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
  const user = await userManager.createOrGetUser("user1");
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
  }
}

module.exports = { setupIpcHandlers };
