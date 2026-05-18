import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const url = new URL(args.request.url);
  const mode = url.searchParams.get("mode") === "editorial" ? "editorial" : "dashboard";
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const membershipStatus = member ? demo.getMembershipStatus(member) : "none";
  const bookings = member ? await demo.listBookings({ memberId: member.id }) : [];
  const latestBooking = bookings[bookings.length - 1] ?? null;
  const pointsSummary = member ? await demo.getMemberPointsSummary({ memberId: member.id }) : null;
  const creditsSummary = member ? await demo.getMemberCreditsSummary({ memberId: member.id }) : null;
  const studios = await demo.listStudios({ includeInactive: true });
  const studioMap = new Map(studios.map((s) => [s.id, s.name]));
  const bookingUi = latestBooking
    ? {
        ...latestBooking,
        studioName: studioMap.get(latestBooking.studio) ?? latestBooking.studio
      }
    : null;

  return json({ lang, mode, member, membershipStatus, bookingUi, pointsSummary, creditsSummary });
}

function membershipStatusLabel(lang: Parameters<typeof t>[0], status: "none" | "active" | "expired") {
  if (status === "active") return t(lang, "membershipStatusActive");
  if (status === "expired") return t(lang, "membershipStatusExpired");
  return t(lang, "membershipStatusNone");
}

function weekdayZh(d: Date) {
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return names[d.getDay()] ?? "";
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatZhMonthDay(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseIso(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function AvatarStack(props: { names: string[] }) {
  const initials = props.names
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n.trim())
    .map((n) => {
      if (n.length <= 2) return n.toUpperCase();
      return n
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
    });

  return (
    <div className="flex -space-x-2">
      {initials.map((v, idx) => (
        <div
          key={`${v}_${idx}`}
          className="grid size-7 place-items-center rounded-full border border-white/25 bg-white/10 text-[11px] font-semibold"
        >
          {v || "•"}
        </div>
      ))}
    </div>
  );
}

function NextSessionHero(props: {
  lang: Parameters<typeof t>[0];
  booking: NonNullable<ReturnType<typeof useLoaderData<typeof loader>>["bookingUi"]>;
}) {
  const { lang, booking } = props;
  const start = parseIso(booking.startsAt);
  const end = parseIso(booking.endsAt);
  const dateZh = start ? `${formatZhMonthDay(start)} · ${weekdayZh(start)}` : "";
  const timeLine = start && end ? `${formatTime(start)} – ${formatTime(end)} · ${booking.studioName}` : "";

  return (
    <div className="relative overflow-hidden rounded-[26px] bg-[#120f0c] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(1200px 400px at 18% 20%, rgba(255, 220, 180, 0.10), transparent 50%), radial-gradient(900px 520px at 85% 10%, rgba(255, 255, 255, 0.06), transparent 55%), linear-gradient(135deg, rgba(0,0,0,0.82), rgba(39,31,24,0.70))"
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 6px, rgba(255,255,255,0) 6px 14px)"
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-[11px] tracking-wide opacity-80">{lang === "zh" ? "下一次拍摄" : "Next session"}</div>
          <div className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] opacity-90">
            {booking.status === "confirmed" ? (lang === "zh" ? "已确认" : "Confirmed") : booking.status}
          </div>
        </div>

        <div className="mt-3 text-[28px] leading-tight [font-family:var(--font-display)]">{lang === "zh" ? dateZh : dateZh}</div>
        <div className="mt-1 text-sm opacity-80">{timeLine}</div>

        <div className="mt-4 flex items-center justify-between rounded-[20px] bg-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <AvatarStack names={["T", "Y"]} />
            <div className="text-sm">
              <span className="opacity-90">{booking.photographer}</span>
              <span className="opacity-65">{lang === "zh" ? " · 摄影师" : " · Photographer"}</span>
            </div>
          </div>
          <div className="opacity-70">
            <ChevronRight />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  suffix?: string;
  note: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-[color:var(--muted)]">{props.label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-[30px] leading-none [font-family:var(--font-display)]">{props.value}</div>
        {props.suffix ? <div className="text-xs text-[color:var(--muted)]">{props.suffix}</div> : null}
      </div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">{props.note}</div>
    </Card>
  );
}

function StripeThumb(props: { tone: "warm" | "cool"; label: string }) {
  const bg =
    props.tone === "warm"
      ? "linear-gradient(135deg, rgba(160,114,72,0.18), rgba(255,252,246,0.9)), repeating-linear-gradient(135deg, rgba(97,86,72,0.10) 0 6px, rgba(97,86,72,0.02) 6px 12px)"
      : "linear-gradient(135deg, rgba(15,23,42,0.06), rgba(255,252,246,0.9)), repeating-linear-gradient(135deg, rgba(97,86,72,0.10) 0 6px, rgba(97,86,72,0.02) 6px 12px)";
  return (
    <div
      className="grid h-[74px] w-full place-items-center rounded-[18px] border border-[color:var(--border)]"
      style={{ background: bg }}
    >
      <div className="text-[12px] tracking-wide text-[color:var(--muted)] [font-family:var(--font-display)]">
        {props.label}
      </div>
    </div>
  );
}

function PackageCard(props: { titleZh: string; titleEn: string; minutes: string; price: string; tone: "warm" | "cool" }) {
  return (
    <Card className="overflow-hidden p-4">
      <StripeThumb tone={props.tone} label={props.titleEn} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{props.titleZh}</div>
          <div className="text-xs text-[color:var(--muted)]">{props.titleEn}</div>
        </div>
        <div className="text-xs text-[color:var(--muted)]">{props.price}</div>
      </div>
      <div className="mt-2 text-xs text-[color:var(--muted)]">{props.minutes}</div>
    </Card>
  );
}

function RecommendedPackages() {
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-medium">推荐配套</div>
        <Link to="/app/packages" className="text-xs text-[color:var(--muted)] underline-offset-4 hover:underline">
          查看
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <PackageCard titleZh="日常肖像" titleEn="Daily Portrait" minutes="120 分" price="S$ 380" tone="warm" />
        <PackageCard titleZh="婚纱外拍" titleEn="Bridal Outdoor" minutes="480 分" price="S$ 980" tone="cool" />
      </div>
    </div>
  );
}

function DashboardHome(props: {
  lang: Parameters<typeof t>[0];
  memberName: string;
  membershipStatus: "none" | "active" | "expired";
  bookingUi: ReturnType<typeof useLoaderData<typeof loader>>["bookingUi"];
  pointsSummary: ReturnType<typeof useLoaderData<typeof loader>>["pointsSummary"];
  creditsSummary: ReturnType<typeof useLoaderData<typeof loader>>["creditsSummary"];
}) {
  const { lang, memberName, membershipStatus, bookingUi, pointsSummary, creditsSummary } = props;
  const greeting = lang === "zh" ? "下午好" : "Good afternoon";
  const points = pointsSummary?.available ?? 0;
  const expiringSoon = pointsSummary?.expiringSoon ?? 0;
  const creditsBalance = creditsSummary?.balance ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="px-1 pt-1">
        <div className="text-[46px] leading-none [font-family:var(--font-display)]" style={{ letterSpacing: "0.06em" }}>
          lux
        </div>
        <div className="mt-3 text-xs tracking-wide text-[color:var(--muted)]">
          {membershipStatus === "active" ? "正式 · 银卡会员" : membershipStatusLabel(lang, membershipStatus)}
        </div>
        <div className="mt-2 text-sm text-[color:var(--muted)]">
          {greeting}, {memberName}
        </div>
      </div>

      {membershipStatus === "active" && bookingUi ? (
        <NextSessionHero lang={lang} booking={bookingUi} />
      ) : (
        <Card className="p-5">
          <div className="text-sm text-[color:var(--muted)]">{lang === "zh" ? "下一次拍摄" : "Next session"}</div>
          <div className="mt-2 text-xl [font-family:var(--font-display)]">{lang === "zh" ? "尚未预约" : "Not booked"}</div>
          <Button asChild className="mt-4 h-12 w-full rounded-[18px]">
            <Link to="/app/booking/new">{t(lang, "bookNow")}</Link>
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={lang === "zh" ? "积分" : "Points"}
          value={String(points)}
          suffix="pts"
          note={lang === "zh" ? `${expiringSoon} 分将在 30 天后过期` : `${expiringSoon} pts expiring in 30 days`}
        />
        <StatCard
          label="Credit"
          value={String(Math.max(0, creditsBalance))}
          suffix="credits"
          note={lang === "zh" ? "1 credit = 1 次拍摄" : "1 credit = 1 session"}
        />
      </div>

      <RecommendedPackages />
    </div>
  );
}

function EditorialHome(props: {
  lang: Parameters<typeof t>[0];
  memberName: string;
  membershipStatus: "none" | "active" | "expired";
  bookingUi: ReturnType<typeof useLoaderData<typeof loader>>["bookingUi"];
}) {
  const { lang, membershipStatus, bookingUi } = props;
  const start = bookingUi?.startsAt ? parseIso(bookingUi.startsAt) : null;
  const date = start ? `${formatZhMonthDay(start)} · ${formatTime(start)}` : "—";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="relative overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--surface)]">
        <div
          className="h-[320px] w-full"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.08) 55%, rgba(250,246,238,1) 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 6px, rgba(255,255,255,0) 6px 14px), radial-gradient(900px 520px at 70% 20%, rgba(255,255,255,0.24), transparent 60%)",
            backgroundColor: "#2b251f"
          }}
        />

        <div className="absolute left-5 top-5 right-5 flex items-center justify-between text-white">
          <div className="text-[22px] leading-none [font-family:var(--font-display)]" style={{ letterSpacing: "0.06em" }}>
            lux
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-white/12">
            <SearchIcon />
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-[92px] text-white">
          <div className="mb-3 inline-flex rounded-full bg-black/55 px-3 py-1 text-[11px] tracking-wide">活动</div>
          <div className="text-[22px] leading-snug [font-family:var(--font-display)]">5月会员专场 · 暮光胶片之夜</div>
        </div>

        <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-3 bg-[color:var(--surface)] p-4">
          <Card className="p-4">
            <div className="text-xs text-[color:var(--muted)]">积分</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-[30px] leading-none [font-family:var(--font-display)]">480</div>
              <div className="text-xs text-[color:var(--muted)]">pts</div>
            </div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">60 分将在 30 天后过期</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-[color:var(--muted)]">下一次拍摄</div>
            <div className="mt-2 text-sm font-medium">{start ? formatZhMonthDay(start) : "—"}</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {date}
              {bookingUi?.studioName ? ` · ${bookingUi.studioName}` : ""}
            </div>
          </Card>
        </div>
      </div>

      {membershipStatus !== "active" ? (
        <Button asChild className="h-12 w-full rounded-[18px]">
          <Link to="/app/membership">{t(lang, "payActivate")}</Link>
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button asChild className="h-12 rounded-[18px]">
            <Link to="/app/booking/new">预约拍摄</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-[18px] bg-[color:var(--surface)]">
            <Link to="/app/packages">我的配套</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MemberDashboard() {
  const { lang, mode, member, membershipStatus, bookingUi, pointsSummary, creditsSummary } = useLoaderData<typeof loader>();
  const memberName = member?.name ? member.name.split(" ")[0] : "Alex";

  if (mode === "editorial") {
    return <EditorialHome lang={lang} memberName={memberName} membershipStatus={membershipStatus} bookingUi={bookingUi} />;
  }

  return (
    <DashboardHome
      lang={lang}
      memberName={memberName}
      membershipStatus={membershipStatus}
      bookingUi={bookingUi}
      pointsSummary={pointsSummary}
      creditsSummary={creditsSummary}
    />
  );
}
