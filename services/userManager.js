const { supabase } = require("../database/supabase");

class UserManager {
  constructor() {
    this.userStatus = {
      user: null,
      online_at: null,
    };
  }

  async createOrGetUser(username) {
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
        .insert({
          username: username,
          is_online: false,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return null;
      }
      user = newUser;
    }

    // Update userStatus
    this.userStatus.user = user.id;
    this.userStatus.online_at = new Date().toISOString();

    return user;
  }

  async updateUserOnlineStatus(userId, isOnline) {
    const { error } = await supabase
      .from("users")
      .update({ is_online: isOnline })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user online status:", error);
      return false;
    }
    return true;
  }

  getCurrentUser() {
    console.log(this.userStatus.user);
    return this.userStatus.user;
  }

  isUserOnline() {
    return this.userStatus.online_at !== null;
  }
}

// Export a singleton instance
module.exports = new UserManager();
