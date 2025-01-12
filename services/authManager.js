const { supabase } = require("../database/supabase");

class AuthManager {
  constructor() {
    this.currentUser = null;
  }

  async signUp(email, password, username) {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (existingUser) {
      console.log("User already exists, returning existing user");
      return existingUser;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Create user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email,
        username,
      })
      .select()
      .single();

    if (userError) throw userError;

    this.currentUser = userData;
    return userData;
  }

  async signIn(email, password) {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError) throw userError;

    this.currentUser = userData;
    return userData;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

module.exports = new AuthManager();
