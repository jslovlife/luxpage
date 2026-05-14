import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getSession, sessionStorage } from "~/lib/session.server";

/**
 * Logout action.
 * - Destroys session and redirects to /login.
 */
export async function action(args: ActionFunctionArgs) {
  const session = await getSession(args.request);
  return redirect("/login", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) }
  });
}

