const { supabase } = require("../database/supabase");

class FriendManager {
  async sendFriendRequest(userId, friendId) {
    const { data, error } = await supabase.from("friends").insert({
      user_id: userId,
      friend_id: friendId,
      status: "pending",
    });

    if (error) throw error;
    return data;
  }

  async acceptFriendRequest(userId, friendId) {
    const { data, error } = await supabase
      .from("friends")
      .update({ status: "accepted" })
      .match({ user_id: friendId, friend_id: userId, status: "pending" });

    if (error) throw error;
    return data;
  }

  async getFriendsList(userId) {
    const { data, error } = await supabase
      .from("friends")
      .select(
        `
        friend_id,
        users!friends_friend_id_fkey (
          username,
          is_online,
          last_seen
        )
      `
      )
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (error) throw error;
    return data;
  }
}

module.exports = new FriendManager();
