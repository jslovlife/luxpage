import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Outlet, useLoaderData } from "@remix-run/react";
import { AppShell } from "~/components/app-shell";
import { LanguageToggle } from "~/components/lang-toggle";
import { Button } from "~/components/ui/button";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  return json({ lang, user });
}

export default function MemberAppLayout() {
  const { lang } = useLoaderData<typeof loader>();

  return (
    <AppShell
      lang={lang}
      variant="member"
      hideHeader
      brandHref="/app"
      brandLabel="lux"
      nav={[
        { to: "/app", labelKey: "home" },
        { to: "/app/booking", labelKey: "bookings" },
        { to: "/app/messages", labelKey: "messages" },
        { to: "/app/me", labelKey: "me" }
      ]}
      mobileNav={[
        { to: "/app", labelKey: "home" },
        { to: "/app/booking", labelKey: "bookings" },
        { to: "/app/messages", labelKey: "messages" },
        { to: "/app/me", labelKey: "me" }
      ]}
    >
      <div
        className="fixed right-4 top-4 z-30 flex items-center gap-2 md:right-6"
        style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <LanguageToggle lang={lang} />
        <Form method="post" action="/logout">
          <Button variant="outline" size="sm" type="submit" className="h-9 rounded-full bg-[color:var(--surface)] px-3">
            {lang === "zh" ? "登出" : "Logout"}
          </Button>
        </Form>
      </div>
      <Outlet />
    </AppShell>
  );
}
