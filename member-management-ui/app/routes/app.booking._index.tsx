import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import * as React from "react";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { cn } from "~/lib/utils";
import { getShootPackage } from "~/lib/shoot-packages";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const url = new URL(args.request.url);
  const tab = (url.searchParams.get("tab") as "upcoming" | "pending" | "history" | null) ?? "upcoming";
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const bookings = member ? await demo.listBookings({ memberId: member.id }) : [];
  return json({ lang, member, bookings, tab });
}

export default function BookingIndexPage() {
  const { lang, member, bookings, tab } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as typeof tab | null) ?? tab;

  const now = Date.now();
  const categorized = React.useMemo(() => {
    const upcoming: typeof bookings = [];
    const pending: typeof bookings = [];
    const history: typeof bookings = [];

    for (const b of bookings) {
      const start = new Date(b.startsAt).getTime();
      const isPast = !Number.isNaN(start) && start < now;
      if (b.status === "pending") {
        pending.push(b);
        continue;
      }
      if (b.status === "cancelled" || isPast) {
        history.push(b);
        continue;
      }
      upcoming.push(b);
    }

    return { upcoming, pending, history };
  }, [bookings, now]);

  const list = categorized[activeTab] ?? categorized.upcoming;

  const setTab = (next: typeof tab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  const memberNo = member?.memberNo ?? "-";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="px-1">
        <h1 className="mt-1 text-[34px] leading-tight [font-family:var(--font-display)]">{lang === "zh" ? "我的预约" : "My bookings"}</h1>
      </div>

      <div className="px-1">
        <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={cn(
              "h-10 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "upcoming"
                ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "即将到来" : "Upcoming"}
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={cn(
              "h-10 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "pending"
                ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "待确认" : "Pending"}
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "h-10 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "history"
                ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "历史" : "History"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {list.length ? (
          list.map((b) => <BookingCard key={b.id} lang={lang} booking={b} memberNo={memberNo} />)
        ) : (
          <Card className="bg-[color:var(--bg)]">
            <CardContent className="p-4 text-sm text-[color:var(--muted)]">{lang === "zh" ? "暂无预约" : "No bookings yet"}</CardContent>
          </Card>
        )}
      </div>

      <div className="pt-2">
        <Button asChild size="lg" className="h-12 w-full rounded-[18px]">
          <Link to="/app/booking/new">{lang === "zh" ? "新增预约" : "New booking"}</Link>
        </Button>
      </div>
    </div>
  );
}

function weekdayZh(d: Date) {
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return names[d.getDay()] ?? "";
}

function weekdayEn(d: Date) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[d.getDay()] ?? "";
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatZhMonthDay(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatEnMonthDay(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  } catch {
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${names[d.getMonth()] ?? ""} ${d.getDate()}`;
  }
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseIso(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function CameraIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 7a2 2 0 0 1 2-2h3l1-1h4l1 1h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  );
}

function UserIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
    </svg>
  );
}

function PinIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
      <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  );
}

function statusChip(status: string) {
  if (status === "confirmed") return { labelZh: "已确认", labelEn: "Confirmed", cls: "bg-[#e7f3ea] text-[#236d3a]" };
  if (status === "pending") return { labelZh: "待确认", labelEn: "Pending", cls: "bg-[#f3efe6] text-[#8a5a2b]" };
  if (status === "cancelled") return { labelZh: "已取消", labelEn: "Cancelled", cls: "bg-[#efecec] text-[#6b6b6b]" };
  return { labelZh: status, labelEn: status, cls: "bg-[color:var(--bg)] text-[color:var(--muted)]" };
}

function packageTitle(packageId: string, lang: "zh" | "en") {
  const pkg = getShootPackage(packageId);
  if (!pkg) return packageId;
  return lang === "zh" ? pkg.titleZh : pkg.titleEn;
}

function BookingCard(props: {
  lang: "zh" | "en";
  booking: { id: string; packageId: string; startsAt: string; studio: string; photographer: string; status: string };
  memberNo: string;
}) {
  const { lang, booking } = props;
  const start = parseIso(booking.startsAt);
  const dateLine = start
    ? lang === "zh"
      ? `${formatZhMonthDay(start)} · ${weekdayZh(start)}`
      : `${formatEnMonthDay(start)} · ${weekdayEn(start)}`
    : "—";
  const time = start ? formatTime(start) : "—";
  const chip = statusChip(booking.status);
  const isConfirmed = booking.status === "confirmed";

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--primary)]" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs text-[color:var(--muted)]">{dateLine}</div>
          <div className={cn("rounded-full px-3 py-1 text-xs font-medium", chip.cls)}>{lang === "zh" ? chip.labelZh : chip.labelEn}</div>
        </div>

        <div className="mt-1 text-[28px] leading-none [font-family:var(--font-display)]">{time}</div>

        <div className="mt-4 flex flex-col gap-2 text-sm text-[color:var(--muted)]">
          <div className="flex items-center gap-2">
            <CameraIcon className="h-4 w-4" />
            <span className="text-[color:var(--text)]">{packageTitle(booking.packageId, lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span className="text-[color:var(--text)]">{booking.photographer}</span>
          </div>
          <div className="flex items-center gap-2">
            <PinIcon className="h-4 w-4" />
            <span className="text-[color:var(--text)]">{booking.studio}</span>
          </div>
        </div>

        <div className={cn("mt-4 grid gap-3", isConfirmed ? "grid-cols-2" : "grid-cols-1")}>
          <Button variant="outline" className="h-11 rounded-full bg-[color:var(--surface)]">
            {lang === "zh" ? "查看详情" : "Details"}
          </Button>
          {isConfirmed ? (
            <Button asChild variant="secondary" className="h-11 rounded-full">
              <Link to={`/app/booking/new?packageId=${encodeURIComponent(booking.packageId)}`}>{lang === "zh" ? "改期" : "Reschedule"}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
