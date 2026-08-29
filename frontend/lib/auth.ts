import { createClient } from "@/lib/supabase/client";

export type MedCareUser = {
  name: string;
  email: string;
};

export const SESSION_KEY = "medcare.session";
export const SESSION_EVENT = "medcare:session-changed";

// Demo credentials for testing (optional - actual signup/login uses Supabase)
export const DEMO_EMAIL = "demo@medcare.ai";
export const DEMO_PASSWORD = "medcare123";

/**
 * Sign up a new user with Supabase
 */
export async function signup(email: string, password: string): Promise<MedCareUser> {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user?.email) {
    throw new Error("Signup failed: no user data returned");
  }

  const user: MedCareUser = {
    name: data.user.email?.split("@")[0] || "User",
    email: data.user.email,
  };

  window.dispatchEvent(new Event(SESSION_EVENT));
  return user;
}

/**
 * Sign in with email and password using Supabase
 */
export async function login(email: string, password: string): Promise<MedCareUser> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user?.email) {
    throw new Error("Login failed: no user data returned");
  }

  const user: MedCareUser = {
    name: data.user.email?.split("@")[0] || "User",
    email: data.user.email,
  };

  window.dispatchEvent(new Event(SESSION_EVENT));
  return user;
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
  }

  window.dispatchEvent(new Event(SESSION_EVENT));
}

/**
 * Get the current user from Supabase session
 */
export async function getCurrentUser(): Promise<MedCareUser | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return {
    name: user.email.split("@")[0] || "User",
    email: user.email,
  };
}
