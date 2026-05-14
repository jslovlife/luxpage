import { createCookieSessionStorage, redirect } from "@remix-run/node";

export type UserSession = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "member" | "admin";
};

/**
 * Session storage for UI prototype.
 * - In production, move secrets to env vars.
 * - Use secure cookies on HTTPS.
 */
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__mm_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET ?? "dev-secret-change-me"],
    secure: process.env.NODE_ENV === "production"
  }
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

/**
 * Get current user from session, if present.
 */
export async function getUser(request: Request): Promise<UserSession | null> {
  const session = await getSession(request);
  const user = session.get("user") as UserSession | undefined;
  return user ?? null;
}

/**
 * Require a user login.
 */
export async function requireUser(request: Request): Promise<UserSession> {
  const user = await getUser(request);
  if (!user) throw redirect("/login");
  return user;
}

/**
 * Require admin role.
 */
export async function requireAdmin(request: Request): Promise<UserSession> {
  const user = await requireUser(request);
  if (user.role !== "admin") throw redirect("/app");
  return user;
}

