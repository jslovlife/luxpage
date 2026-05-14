import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AppShell } from "~/components/app-shell";
import { LanguageToggle } from "~/components/lang-toggle";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { t } from "~/lib/i18n";

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
      brandHref="/app"
      brandLabel={`${t(lang, "appName")} · ${t(lang, "memberApp")}`}
      nav={[
        { to: "/app", labelKey: "dashboard" },
        { to: "/app/membership", labelKey: "membershipFee" },
        { to: "/app/booking", labelKey: "bookings" },
        { to: "/app/photos", labelKey: "photos" },
        { to: "/app/notifications", labelKey: "notifications" },
        { to: "/app/profile", labelKey: "profile" }
      ]}
      mobileNav={[
        { to: "/app", labelKey: "dashboard" },
        { to: "/app/booking", labelKey: "bookings" },
        { to: "/app/photos", labelKey: "photos" },
        { to: "/app/notifications", labelKey: "notifications" },
        { to: "/app/profile", labelKey: "profile" }
      ]}
      headerRight={
        <LanguageToggle lang={lang} />
      }
    >
      <Outlet />
    </AppShell>
  );
}
