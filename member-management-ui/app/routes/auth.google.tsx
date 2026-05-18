import type { LoaderFunctionArgs } from "@remix-run/node";
import { startMemberGoogleLogin } from "~/lib/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  return startMemberGoogleLogin(args.request);
}

