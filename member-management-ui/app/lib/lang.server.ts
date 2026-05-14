import { createCookie } from "@remix-run/node";
import type { Lang } from "./i18n";

/**
 * Language cookie helper.
 * MVP: zh/en only.
 */
export const langCookie = createCookie("lang", {
  path: "/",
  sameSite: "lax",
  httpOnly: false
});

export async function getLang(request: Request): Promise<Lang> {
  const cookie = request.headers.get("Cookie");
  const lang = (await langCookie.parse(cookie)) as Lang | undefined;
  return lang === "en" || lang === "zh" ? lang : "zh";
}

