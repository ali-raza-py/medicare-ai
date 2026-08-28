// Mock authentication for the MedCare AI frontend.
// Single swap-in point for the real backend: once Ali delivers the API
// contracts, replace the simulated logic inside login() with the real
// FastAPI calls and keep the exported signatures unchanged.

export type MedCareUser = {
  name: string;
  email: string;
};

export const SESSION_KEY = "medcare.session";
export const SESSION_EVENT = "medcare:session-changed";

export const DEMO_EMAIL = "demo@medcare.ai";
export const DEMO_PASSWORD = "medcare123";

const DEMO_LATENCY_MS = 600;

export async function login(email: string, password: string): Promise<MedCareUser> {
  // Simulated network latency so loading states are exercised in the demo.
  await new Promise((resolve) => setTimeout(resolve, DEMO_LATENCY_MS));

  const valid =
    email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  const user: MedCareUser = { name: "Ayesha Khan", email: DEMO_EMAIL };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
  return user;
}

export function logout(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
