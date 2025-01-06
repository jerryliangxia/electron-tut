const { supabase } = require("../database/supabase");

class StatsManager {
  async getUserData(userId) {
    console.log("StatsManager: Getting user data for:", userId);
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
      scores: { today: 0, week: 0, month: 0, year: 0 },
      hours: { today: 0, week: 0, month: 0, year: 0 },
      user: data[0]?.users || null,
    };

    data.forEach((session) => {
      const sessionStart = new Date(session.start_time);
      const score = session.score || 0;
      const minutes = session.duration_minutes || 0;

      stats.scores.year += score;
      if (sessionStart >= startOfMonth) stats.scores.month += score;
      if (sessionStart >= startOfWeek) stats.scores.week += score;
      if (sessionStart >= startOfDay) stats.scores.today += score;

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

  async getUserDailyScore(userId) {
    console.log("StatsManager: Getting daily score for:", userId);
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const { data, error } = await supabase
      .from("sessions")
      .select("score")
      .eq("user_id", userId)
      .gte("start_time", startOfDay.toISOString());

    if (error) {
      console.error("Error fetching user daily score:", error);
      return 0;
    }

    const dailyScore = data.reduce(
      (total, session) => total + (session.score || 0),
      0
    );
    return Math.round(dailyScore * 100) / 100;
  }

  async getOnlineUsers() {
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
}

module.exports = new StatsManager();
