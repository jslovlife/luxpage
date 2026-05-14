import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { langCookie } from "~/lib/lang.server";

/**
 * Switch UI language via cookie.
 * @example
 * GET /lang/zh
 * GET /lang/en
 */
export async function loader(args: LoaderFunctionArgs) {
  const lang = args.params.lang === "en" ? "en" : "zh";
  const referer = args.request.headers.get("Referer") ?? "/app";
  return redirect(referer, {
    headers: { "Set-Cookie": await langCookie.serialize(lang) }
  });
}

