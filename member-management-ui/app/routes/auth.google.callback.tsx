import type { LoaderFunctionArgs } from "@remix-run/node";
import { completeMemberGoogleLogin } from "~/lib/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  return completeMemberGoogleLogin(args.request);
}

