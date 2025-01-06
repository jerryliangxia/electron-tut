const { ipcMain } = require("electron");
const statsManager = require("../services/statsManager");
const userManager = require("../services/userManager");

function setupIpcHandlers() {
  console.log("Setting up IPC handlers");
  ipcMain.handle("get-user-stats", async () => {
    console.log("IPC: get-user-stats called");
    const userId = userManager.getCurrentUser();
    console.log("IPC: got userId:", userId);

    if (!userId) {
      console.log("IPC: no userId available");
      return null;
    }

    const stats = await statsManager.getUserData(userId);
    console.log("IPC: got stats:", stats);

    if (!stats) {
      console.log("IPC: no stats available");
      return null;
    }

    const result = {
      username: stats.user.username,
      is_online: stats.user.is_online,
      daily_score: await statsManager.getUserDailyScore(userId),
      scores: stats.scores,
      hours: stats.hours,
    };
    console.log("IPC: returning result:", result);
    return result;
  });

  ipcMain.handle("show-notification", () => {
    new Notification({
      title: "Notification",
      body: "Test notification",
    }).show();
  });
}

module.exports = { setupIpcHandlers };
