const authManager = require("../services/authManager");
const friendManager = require("../services/friendManager");
const { supabase } = require("../database/supabase");

async function testMultipleUsers() {
  // Try to get existing users first
  const { data: existingUsers, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .in("email", ["jerrylxia@gmail.com", "jxia924@gmail.com"]);

  if (fetchError) {
    console.error("Error fetching existing users:", fetchError);
    return;
  }

  let user1, user2;

  // Get or create user1
  user1 = existingUsers?.find((u) => u.email === "jerrylxia@gmail.com");
  if (!user1) {
    try {
      user1 = await authManager.signUp(
        "jerrylxia@gmail.com",
        "password123",
        "user1_new"
      );
      console.log("Created new user1:", user1);
    } catch (error) {
      console.error("Error creating user1:", error);
      return;
    }
  } else {
    console.log("Using existing user1:", user1);
  }

  // Get or create user2
  user2 = existingUsers?.find((u) => u.email === "jxia924@gmail.com");
  if (!user2) {
    try {
      user2 = await authManager.signUp(
        "jxia924@gmail.com",
        "password123",
        "user2_new"
      );
      console.log("Created new user2:", user2);
    } catch (error) {
      console.error("Error creating user2:", error);
      return;
    }
  } else {
    console.log("Using existing user2:", user2);
  }

  // Test friend functionality
  try {
    // Check if they're already friends
    const existingFriends = await friendManager.getFriendsList(user1.id);
    const alreadyFriends = existingFriends.some(
      (f) => f.friend_id === user2.id
    );

    if (!alreadyFriends) {
      // Send friend request
      console.log("Sending friend request...");
      await friendManager.sendFriendRequest(user1.id, user2.id);

      // Accept friend request
      console.log("Accepting friend request...");
      await friendManager.acceptFriendRequest(user2.id, user1.id);
    } else {
      console.log("Users are already friends");
    }

    // Get and display friends list
    const friends = await friendManager.getFriendsList(user1.id);
    console.log("User1 friends:", friends);
  } catch (error) {
    console.error("Error in friend operations:", error);
  }
}

testMultipleUsers().catch(console.error);
