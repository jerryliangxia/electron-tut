const { app, powerMonitor } = require("electron");
const { supabase } = require("../database/supabase");
const {
  MULTIPLIER_INCREMENT,
  MULTIPLIER_MAX,
  IDLE_THRESHOLD,
} = require("../config/constants");

class SessionManager {
  constructor() {
    this.currentSession = null;
    this.lastActiveTime = Date.now();
    this.checkIdleState = this.checkIdleState.bind(this);
    setInterval(this.checkIdleState, 60000); // Check every minute
  }

  calculateMultiplier(durationMinutes) {
    const multiplier =
      1 + Math.floor(durationMinutes / 60) * MULTIPLIER_INCREMENT;
    return Math.min(multiplier, MULTIPLIER_MAX);
  }

  calculateSessionScore(durationMinutes, multiplier) {
    return durationMinutes * multiplier;
  }

  async startSession(userId, sessionType) {
    console.log(`Starting new ${sessionType} session for user:`, userId);
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        session_type: sessionType,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error starting session:", error);
      return null;
    }

    this.lastUserId = userId; // Store user ID for future use
    this.currentSession = data;
    console.log("Session started:", data.id);
    return data;
  }

  async initializeUserSession(user) {
    // Start initial session
    const session = await this.startSession(user.id, "app_session");
    if (!session) {
      console.error("Failed to initialize user session");
      return false;
    }

    this.currentSession = session;
    return true;
  }

  async handleLockScreen() {
    console.log("Screen locked, ending current session");
    if (this.currentSession) {
      await this.endSession(this.currentSession.id);
      this.currentSession = null; // Ensure current session is cleared
    }
  }

  async handleUnlockScreen() {
    console.log("Screen unlocked, starting new session");
    if (!this.currentSession) {
      // Only start new session if we don't have one
      const session = await this.startSession(
        this.lastUserId,
        "screen_session"
      );
      if (session) {
        console.log("New session started after unlock:", session.id);
        this.currentSession = session;
        this.lastUserId = session.user_id; // Store user ID for future use
      } else {
        console.error("Failed to start new session after unlock");
      }
    }
  }

  async handleAppQuit(event) {
    if (this.currentSession) {
      event.preventDefault();
      await this.endSession(this.currentSession.id);
      app.quit();
    }
  }

  async endSession(sessionId) {
    console.log("Ending session:", sessionId);
    const endTime = new Date();
    const session = this.currentSession;

    if (!session) {
      console.log("No current session to end");
      return;
    }

    const durationMinutes = Math.floor(
      (endTime - new Date(session.start_time)) / 1000 / 60
    );
    const multiplier = this.calculateMultiplier(durationMinutes);
    const score = this.calculateSessionScore(durationMinutes, multiplier);

    const { error } = await supabase
      .from("sessions")
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        multiplier: multiplier,
        score: score,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error ending session:", error);
    } else {
      console.log("Session ended successfully:", sessionId);
      this.currentSession = null;
    }
  }

  // Function to update session duration
  async updateSessionDuration(sessionId, startTime) {
    const now = new Date();
    const durationMinutes = Math.floor((now - new Date(startTime)) / 1000 / 60);
    const multiplier = this.calculateMultiplier(durationMinutes);
    const score = this.calculateSessionScore(durationMinutes, multiplier);

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
  async checkIdleState() {
    console.log("CHECKING IDLE STATE");
    const idleState = powerMonitor.getSystemIdleState(IDLE_THRESHOLD);
    const now = Date.now();

    if (this.currentSession) {
      // Update duration periodically even if not idle
      await this.updateSessionDuration(
        this.currentSession.id,
        this.currentSession.start_time
      );
    }

    if (idleState === "idle" && this.currentSession) {
      // If user became idle, end the current session
      await this.endSession(this.currentSession.id);
    } else if (idleState === "active" && !this.currentSession) {
      // If user became active and there's no current session, start a new one
      const session = await this.startSession(userStatus.user, "app_session");
      this.currentSession = session;
    }

    this.lastActiveTime = now;
  }
}

module.exports = new SessionManager();
