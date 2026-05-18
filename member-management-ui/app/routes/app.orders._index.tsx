import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import * as React from "react";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { cn } from "~/lib/utils";

function BackIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

type PackageMeta = {
  id: string;
  titleZh: string;
  titleEn: string;
};

const TOPUP_PACKAGES: PackageMeta[] = [
  { id: "PKG-3888-10", titleZh: "3888 元 · 10 个 credit", titleEn: "3888 · 10 credits" },
  { id: "PKG-6888-20", titleZh: "6888 元 · 20 个 credit", titleEn: "6888 · 20 credits" },
  { id: "PKG-9888-30", titleZh: "9888 元 · 30 个 credit", titleEn: "9888 · 30 credits" }
];

function packageTitle(packageId: string, lang: "zh" | "en") {
  const found = TOPUP_PACKAGES.find((p) => p.id === packageId);
  if (!found) return packageId;
  return lang === "zh" ? found.titleZh : found.titleEn;
}

function statusLabel(status: string, lang: "zh" | "en") {
  if (status === "submitted") return lang === "zh" ? "待审核" : "Submitted";
  if (status === "approved") return lang === "zh" ? "已通过" : "Approved";
  if (status === "rejected") return lang === "zh" ? "已拒绝" : "Rejected";
  return status;
}

function statusBadge(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const url = new URL(args.request.url);
  const tab = (url.searchParams.get("tab") as "current" | "history" | null) ?? "current";
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const orders = member ? await demo.listTopupOrders({ memberId: member.id }) : [];
  return json({ lang, tab, orders });
}

export default function OrdersIndexPage() {
  const { lang, tab, orders } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as typeof tab | null) ?? tab;

  const filtered = React.useMemo(() => {
    if (activeTab === "current") return orders.filter((o) => o.status === "submitted");
    return orders.filter((o) => o.status !== "submitted");
  }, [activeTab, orders]);

  const setTab = (next: typeof tab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

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
        <div className="text-base font-medium">{lang === "zh" ? "全部订单" : "Orders"}</div>
      </div>

      <div className="px-1">
        <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("current")}
            className={cn(
              "h-10 flex-1 rounded-full px-3 font-medium transition-colors",
              activeTab === "current"
                ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm"
                : "text-[color:var(--muted)]"
            )}
          >
            {lang === "zh" ? "当前" : "Current"}
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
        {filtered.length ? (
          filtered.map((o) => (
            <Link key={o.id} to={`/app/orders/${o.id}`} className="block">
              <Card className="p-4 transition-colors hover:bg-[color:var(--surface)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{packageTitle(o.packageId, lang)}</div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      {o.amount} {o.currency} · {o.id}
                    </div>
                    <div className="mt-2 text-xs text-[color:var(--muted)]">{o.createdAt.slice(0, 10)}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="outline" className={cn("capitalize", statusBadge(o.status))}>
                      {statusLabel(o.status, lang)}
                    </Badge>
                    <div className="text-xs text-[color:var(--muted)]">→</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="p-4 text-sm text-[color:var(--muted)]">{lang === "zh" ? "暂无订单" : "No orders"}</Card>
        )}
      </div>
    </div>
  );
}

