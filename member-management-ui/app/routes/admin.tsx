import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { AppShell } from "~/components/app-shell";
import { LanguageToggle } from "~/components/lang-toggle";
import { getLang } from "~/lib/lang.server";
import { requireAdmin } from "~/lib/session.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const url = new URL(args.request.url);
  if (url.pathname === "/admin/login") return json({ lang, bypass: true });
  const user = await requireAdmin(args.request);
  return json({ lang, bypass: false, user });
}

export default function AdminLayout() {
  const { lang } = useLoaderData<typeof loader>();
  const location = useLocation();
  if (location.pathname === "/admin/login") return <Outlet />;

  return (
    <AppShell
      lang={lang}
      brandHref="/admin"
      brandLabel={`${t(lang, "appName")} · ${t(lang, "admin")}`}
      nav={[
        { to: "/admin", labelKey: "dashboard" },
        { to: "/admin/bookings", labelKey: "bookings" },
        { to: "/admin/rules", labelKey: "rules" },
        { to: "/admin/studios", labelKey: "studios" },
        { to: "/admin/members", labelKey: "members" },
        { to: "/admin/payments", labelKey: "paymentMethods" },
        { to: "/admin/orders", labelKey: "orders" },
        { to: "/admin/photos", labelKey: "photos" }
      ]}
      headerRight={
        <LanguageToggle lang={lang} />
      }
    >
      <Outlet />
    </AppShell>
  );
}
