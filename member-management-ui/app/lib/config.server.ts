export type AuthMode = "demo" | "api";

export function getAuthMode(): AuthMode {
  const v = (process.env.AUTH_MODE ?? "demo").toLowerCase();
  return v === "api" ? "api" : "demo";
}

export function getApiBaseUrl() {
  const mode = getAuthMode();
  const raw = (process.env.API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (mode === "api" && !raw) {
    throw new Error("API_BASE_URL is required when AUTH_MODE=api");
  }
  return raw;
}

export function getAppBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export const apiPaths = {
  googleStart: "/auth/google/start",
  googleComplete: "/auth/google/complete",
  adminLogin: "/admin/login"
};

