import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import * as React from "react";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { cn } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const url = new URL(args.request.url);
  const tab = (url.searchParams.get("tab") as "all" | "in" | "out" | "expired" | null) ?? "all";

  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const points = member ? await demo.getMemberPointsSummary({ memberId: member.id }) : null;
  const entries = member ? await demo.listPointsLedgers({ memberId: member.id }) : [];

  return json({ lang, member, points, entries, tab });
}

function BackIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function PlusIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MinusIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14" />
    </svg>
  );
}

function ClockIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 8v5l3 2" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function parseIso(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDayLine(d: Date, lang: "zh" | "en") {
  if (lang === "zh") return `${d.getMonth() + 1}月${d.getDate()}日`;
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

function PointsRow(props: {
  lang: "zh" | "en";
  entry: {
    id: string;
    kind: "earn" | "deduct";
    points: number;
    titleZh: string;
    titleEn: string;
    subtitleZh?: string;
    subtitleEn?: string;
    createdAt: string;
    expiresAt?: string;
  };
}) {
  const { lang, entry } = props;
  const created = parseIso(entry.createdAt);
  const exp = parseIso(entry.expiresAt);
  const expired = entry.kind === "earn" && exp ? exp.getTime() <= Date.now() : false;
  const icon = expired ? <ClockIcon className="h-4 w-4" /> : entry.kind === "earn" ? <PlusIcon className="h-4 w-4" /> : <MinusIcon className="h-4 w-4" />;
  const iconWrap =
    expired
      ? "bg-[color:var(--bg)] text-[color:var(--muted)]"
      : entry.kind === "earn"
        ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)]"
        : "bg-[color:var(--bg)] text-[color:var(--text)]";

  const title = lang === "zh" ? entry.titleZh : entry.titleEn;
  const subtitle = lang === "zh" ? entry.subtitleZh : entry.subtitleEn;
  const amount = `${entry.kind === "earn" ? "+" : "-"}${entry.points}`;

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", iconWrap)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--muted)]">
          {subtitle ? <span className="truncate">{subtitle}</span> : null}
          {created ? (
            <span className="opacity-70">
              {formatDayLine(created, lang)} {formatTime(created)}
            </span>
          ) : null}
          {expired && exp ? (
            <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-[10px] text-[color:var(--muted)]">
              {lang === "zh" ? "已过期" : "Expired"} · {formatDayLine(exp, lang)}
            </span>
          ) : null}
        </div>
      </div>
      <div className={cn("shrink-0 text-sm font-semibold tabular-nums", entry.kind === "earn" ? "text-[color:var(--primary)]" : "text-[color:var(--text)]")}>
        {amount}
      </div>
    </div>
  );
}

export default function PointsPage() {
  const { lang, points, entries, tab } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as typeof tab | null) ?? tab;

  const now = Date.now();
  const filtered = React.useMemo(() => {
    const list = entries.filter((e) => {
      const exp = e.expiresAt ? new Date(e.expiresAt).getTime() : NaN;
      const expired = e.kind === "earn" && Number.isFinite(exp) ? exp <= now : false;
      if (activeTab === "expired") return expired;
      if (activeTab === "in") return e.kind === "earn" && !expired;
      if (activeTab === "out") return e.kind === "deduct";
      return !expired;
    });
    return list;
  }, [activeTab, entries, now]);

  const setTab = (next: typeof tab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  const available = points?.available ?? 0;
  const expiringSoon = points?.expiringSoon ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="relative flex items-center justify-center px-1 pt-2">
        <Link
          to="/app/me"
          className="absolute left-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
          aria-label={lang === "zh" ? "返回" : "Back"}
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div className="text-base font-medium">{lang === "zh" ? "积分明细" : "Points ledger"}</div>
      </div>

      <div className="px-1 text-center">
        <div className="text-xs text-[color:var(--muted)]">{lang === "zh" ? "可用积分" : "Available points"}</div>
        <div className="mt-2 flex items-end justify-center gap-2">
          <div className="text-[52px] leading-none [font-family:var(--font-display)]">{available}</div>
          <div className="pb-2 text-sm text-[color:var(--muted)]">pts</div>
        </div>
        {expiringSoon > 0 ? (
          <div className="mt-3 inline-flex items-center rounded-full bg-[color:var(--primary-soft)] px-3 py-1 text-xs text-[color:var(--primary)]">
            {lang === "zh" ? `${expiringSoon} 分将在 30 天后过期` : `${expiringSoon} pts expire in 30 days`}
          </div>
        ) : null}
      </div>

      <div className="px-1">
        <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "h-9 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "all" ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm" : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "全部" : "All"}
          </button>
          <button
            type="button"
            onClick={() => setTab("in")}
            className={cn(
              "h-9 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "in" ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm" : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "入账" : "In"}
          </button>
          <button
            type="button"
            onClick={() => setTab("out")}
            className={cn(
              "h-9 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "out" ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm" : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "扣减" : "Out"}
          </button>
          <button
            type="button"
            onClick={() => setTab("expired")}
            className={cn(
              "h-9 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "expired"
                ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "已过期" : "Expired"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length ? (
          filtered.map((e) => <PointsRow key={e.id} lang={lang} entry={e} />)
        ) : (
          <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">
            {lang === "zh" ? "暂无记录" : "No records"}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Button asChild size="lg" className="h-12 w-full rounded-[18px]">
          <Link to="/app/topup">{lang === "zh" ? "去充值 / 买配套" : "Top up / Buy package"}</Link>
        </Button>
      </div>
    </div>
  );
}

