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
 * Human-friendly display name derived from the account email
 * (e.g. "ayesha.khan@example.com" becomes "Ayesha Khan").
 */
export function displayNameFromEmail(email: string): string {
  const pretty = email
    .split("@")[0]
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return pretty || email;
}

function toUser(email: string): MedCareUser {
  return { name: displayNameFromEmail(email), email };
}

/**
 * Sign up a new user with Supabase.
 * `needsEmailConfirmation` is true when the Supabase project requires email
 * confirmation — in that case no session exists until the user opens the link.
 */
export type SignupResult = {
  user: MedCareUser;
  needsEmailConfirmation: boolean;
};

export async function signup(email: string, password: string): Promise<SignupResult> {
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

  // Supabase returns an empty identities list when the email is already registered.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error("An account with this email already exists. Sign in instead.");
  }

  const user = toUser(data.user.email);

  const needsEmailConfirmation = !data.session;
  if (!needsEmailConfirmation) {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }

  return { user, needsEmailConfirmation };
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

  const user = toUser(data.user.email);

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

  return toUser(user.email);
}

/**
 * Send a password-reset email via Supabase.
 * The user receives a link that points to /reset-password with a recovery token.
 */
export async function resetPassword(email: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Set a new password for the currently authenticated user (after following the reset link).
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(error.message);
  }
}
