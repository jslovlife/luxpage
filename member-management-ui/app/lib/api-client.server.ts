import { apiPaths, getApiBaseUrl } from "~/lib/config.server";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "member" | "admin";
};

function apiUrl(path: string) {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildGoogleStartUrl(params: { callbackUrl: string; returnTo?: string }) {
  const u = new URL(apiUrl(apiPaths.googleStart));
  u.searchParams.set("callbackUrl", params.callbackUrl);
  if (params.returnTo) u.searchParams.set("returnTo", params.returnTo);
  return u.toString();
}

export async function apiCompleteGoogleAuth(params: { request: Request; code: string; state?: string | null }) {
  const res = await fetch(apiUrl(apiPaths.googleComplete), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: params.code, state: params.state ?? undefined }),
    redirect: "manual"
  });
  return res;
}

export async function apiAdminLogin(params: { email: string; password: string }) {
  const res = await fetch(apiUrl(apiPaths.adminLogin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: params.email, password: params.password }),
    redirect: "manual"
  });
  return res;
}

export async function parseApiUser(res: Response): Promise<ApiUser | null> {
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as any;
    const u = data?.user ?? data;
    if (!u?.id || !u?.email || !u?.role) return null;
    return {
      id: String(u.id),
      name: String(u.name ?? u.email),
      email: String(u.email),
      avatarUrl: u.avatarUrl ? String(u.avatarUrl) : undefined,
      role: u.role === "admin" ? "admin" : "member"
    };
  } catch {
    return null;
  }
}

