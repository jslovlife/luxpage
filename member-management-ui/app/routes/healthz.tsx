import { json } from "@remix-run/node";

/**
 * Health check endpoint for container platforms.
 */
export async function loader() {
  return json({ ok: true, service: "member-management-ui" });
}

