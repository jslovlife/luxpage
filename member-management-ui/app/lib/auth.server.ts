import { redirect } from "@remix-run/node";
import type { UserSession } from "~/lib/session.server";
import { getSession, sessionStorage } from "~/lib/session.server";
import { getAppBaseUrl, getAuthMode } from "~/lib/config.server";
import { apiAdminLogin, apiCompleteGoogleAuth, buildGoogleStartUrl, parseApiUser } from "~/lib/api-client.server";

function appendSetCookie(headers: Headers, setCookie: string | null) {
  if (!setCookie) return;
  headers.append("Set-Cookie", setCookie);
}

export async function startMemberGoogleLogin(request: Request) {
  const mode = getAuthMode();
  if (mode === "demo") {
    const session = await getSession(request);
    session.set("user", {
      id: "demo-user",
      name: "Alex Tan",
      email: "alex.tan@studio.sg",
      avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
      role: "member"
    } satisfies UserSession);
    return redirect("/app", { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } });
  }

  const appBase = getAppBaseUrl(request);
  const callbackUrl = `${appBase}/auth/google/callback`;
  const returnTo = new URL(request.url).searchParams.get("returnTo") ?? "/app";
  return redirect(buildGoogleStartUrl({ callbackUrl, returnTo }));
}

export async function completeMemberGoogleLogin(request: Request) {
  const mode = getAuthMode();
  if (mode === "demo") return startMemberGoogleLogin(request);

  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state");
  if (!code) throw new Response("Missing code", { status: 400 });

  const res = await apiCompleteGoogleAuth({ request, code, state });
  const user = await parseApiUser(res);
  if (!user || user.role !== "member") throw new Response("Unauthorized", { status: 401 });

  const session = await getSession(request);
  session.set("user", user satisfies UserSession);

  const headers = new Headers();
  appendSetCookie(headers, res.headers.get("set-cookie"));
  appendSetCookie(headers, await sessionStorage.commitSession(session));
  return redirect("/app", { headers });
}

export async function signInAdminWithPassword(request: Request, params: { email: string; password: string }) {
  const mode = getAuthMode();
  if (mode === "demo") {
    const expected = process.env.ADMIN_DEMO_PASSWORD ?? "admin";
    if (params.password !== expected) return { ok: false as const, message: "Invalid credentials" };
    const session = await getSession(request);
    session.set("user", {
      id: "demo-admin",
      name: "Admin",
      email: params.email || "admin@example.com",
      avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
      role: "admin"
    } satisfies UserSession);
    const headers = new Headers();
    appendSetCookie(headers, await sessionStorage.commitSession(session));
    return { ok: true as const, redirectTo: "/admin", headers };
  }

  const res = await apiAdminLogin({ email: params.email, password: params.password });
  const user = await parseApiUser(res);
  if (!user || user.role !== "admin") return { ok: false as const, message: "Invalid credentials" };

  const session = await getSession(request);
  session.set("user", user satisfies UserSession);

  const headers = new Headers();
  appendSetCookie(headers, res.headers.get("set-cookie"));
  appendSetCookie(headers, await sessionStorage.commitSession(session));
  return { ok: true as const, redirectTo: "/admin", headers };
}

