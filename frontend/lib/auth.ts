import { createClient } from "@/lib/supabase/client";

export type UserRole = "patient" | "hospital";

export type MedCareUser = {
  name: string;
  email: string;
  role: UserRole;
  hospitalName: string | null;
};

export const SESSION_KEY = "medcare.session";
export const SESSION_EVENT = "medcare:session-changed";

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

function toUser(email: string, metadata?: Record<string, unknown>): MedCareUser {
  const hospitalName = typeof metadata?.hospital_name === "string" && metadata.hospital_name.trim()
    ? metadata.hospital_name.trim()
    : null;
  return {
    name: hospitalName ?? displayNameFromEmail(email),
    email,
    role: metadata?.role === "hospital" ? "hospital" : "patient",
    hospitalName,
  };
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

export async function signup(
  email: string,
  password: string,
  role: UserRole = "patient",
  hospitalName?: string,
): Promise<SignupResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/login`,
      data: {
        role,
        ...(role === "hospital" && hospitalName?.trim()
          ? { hospital_name: hospitalName.trim() }
          : {}),
      },
    },
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

  const user = toUser(data.user.email, data.user.user_metadata);

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

  const user = toUser(data.user.email, data.user.user_metadata);

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
    throw new Error(error.message);
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

  return toUser(user.email, user.user_metadata);
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
