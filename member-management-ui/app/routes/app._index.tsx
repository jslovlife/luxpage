import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const membershipStatus = member ? demo.getMembershipStatus(member) : "none";
  const bookings = member ? await demo.listBookings({ memberId: member.id }) : [];
  const latestBooking = bookings[bookings.length - 1] ?? null;
  return json({ lang, member, membershipStatus, latestBooking });
}

function membershipStatusLabel(lang: Parameters<typeof t>[0], status: "none" | "active" | "expired") {
  if (status === "active") return t(lang, "membershipStatusActive");
  if (status === "expired") return t(lang, "membershipStatusExpired");
  return t(lang, "membershipStatusNone");
}

export default function MemberDashboard() {
  const { lang, member, membershipStatus, latestBooking } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t(lang, "dashboard")}</h1>
          <p className="text-sm text-[color:var(--muted)]">{member?.memberNo ?? t(lang, "memberNo")}</p>
        </div>
        <Badge variant="secondary">{membershipStatusLabel(lang, membershipStatus)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "membershipFee")}</CardTitle>
          <CardDescription>RM3888 · Unlimited shoots</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span>{t(lang, "paymentMethods")}</span>
              <span className="text-[color:var(--muted)]">FPX / Card / DuitNow / TNG</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t(lang, "bookingRulesTitle")}</span>
              <span className="text-[color:var(--muted)]">7-day gap · 2h max</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t(lang, "expiresAt")}</span>
              <span className="text-[color:var(--muted)]">{member?.membershipExpiresAt ?? "-"}</span>
            </div>
            {latestBooking ? (
              <div className="flex items-center justify-between">
                <span>{t(lang, "latestBooking")}</span>
                <span className="text-[color:var(--muted)]">
                  {latestBooking.startsAt.slice(0, 16).replace("T", " ")}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <Button asChild>
              <Link to="/app/membership">{t(lang, "payActivate")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/booking">{t(lang, "bookNow")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/photos">{t(lang, "photos")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
