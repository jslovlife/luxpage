import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

/**
 * Login page (UI mock).
 * - Simulates Google login by writing a user object into session.
 */
export async function loader(args: LoaderFunctionArgs) {
  return redirect("/admin/login");
}
