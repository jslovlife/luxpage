import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  credits: number;
  points: number;
};

const TOPUP_PACKAGES: PackageMeta[] = [
  { id: "PKG-3888-10", titleZh: "3888 元 · 10 个 credit", titleEn: "3888 · 10 credits", credits: 10, points: 38 },
  { id: "PKG-6888-20", titleZh: "6888 元 · 20 个 credit", titleEn: "6888 · 20 credits", credits: 20, points: 68 },
  { id: "PKG-9888-30", titleZh: "9888 元 · 30 个 credit", titleEn: "9888 · 30 credits", credits: 30, points: 98 }
];

function packageMeta(packageId: string) {
  return TOPUP_PACKAGES.find((p) => p.id === packageId) ?? null;
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
  const id = args.params.orderId ?? "";
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) throw new Response("Not Found", { status: 404 });
  const orders = await demo.listTopupOrders({ memberId: member.id });
  const order = orders.find((o) => o.id === id) ?? null;
  if (!order) throw new Response("Not Found", { status: 404 });

  const meta = packageMeta(order.packageId);
  const reviewedAt = order.reviewedAt ? new Date(order.reviewedAt).getTime() : NaN;
  const expiresAt =
    Number.isFinite(reviewedAt) ? new Date(reviewedAt + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;

  return json({ lang, order, meta, expiresAt });
}

export default function OrderDetailPage() {
  const { lang, order, meta, expiresAt } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="relative flex items-center justify-center px-1 pt-2">
        <Link
          to="/app/orders"
          className="absolute left-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
          aria-label={lang === "zh" ? "返回" : "Back"}
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div className="text-base font-medium">{lang === "zh" ? "订单详情" : "Order details"}</div>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{lang === "zh" ? meta?.titleZh ?? order.packageId : meta?.titleEn ?? order.packageId}</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              {order.amount} {order.currency} · {order.id}
            </div>
          </div>
          <Badge variant="outline" className={cn("capitalize", statusBadge(order.status))}>
            {statusLabel(order.status, lang)}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
            <div className="text-[10px] text-[color:var(--muted)]">{lang === "zh" ? "提交时间" : "Submitted"}</div>
            <div className="mt-1 text-sm font-medium">{order.createdAt.slice(0, 16).replace("T", " ")}</div>
          </div>
          <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
            <div className="text-[10px] text-[color:var(--muted)]">{lang === "zh" ? "审核时间" : "Reviewed"}</div>
            <div className="mt-1 text-sm font-medium">{order.reviewedAt ? order.reviewedAt.slice(0, 16).replace("T", " ") : "—"}</div>
          </div>
        </div>

        {order.status === "approved" && meta ? (
          <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-xs font-medium text-emerald-700">{lang === "zh" ? "发放结果" : "Granted"}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-emerald-800">
              <span className="rounded-full bg-white/70 px-3 py-1">{lang === "zh" ? `+${meta.credits} credits` : `+${meta.credits} credits`}</span>
              <span className="rounded-full bg-white/70 px-3 py-1">{lang === "zh" ? `+${meta.points} 积分` : `+${meta.points} points`}</span>
            </div>
            {expiresAt ? (
              <div className="mt-2 text-xs text-emerald-700">{lang === "zh" ? `预计到期：${expiresAt}` : `Estimated expiry: ${expiresAt}`}</div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <a className="text-sm text-[color:var(--primary)] underline-offset-4 hover:underline" href={order.proofUrl} target="_blank" rel="noreferrer">
            {lang === "zh" ? "查看凭证" : "View proof"}
          </a>
          <div className="text-xs text-[color:var(--muted)]">{lang === "zh" ? "凭证文件仅用于审核" : "Proof is used for review only"}</div>
        </div>
      </Card>

      {order.status === "submitted" ? (
        <Card className="p-4">
          <div className="text-sm font-medium">{lang === "zh" ? "审核中" : "In review"}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">{lang === "zh" ? "审核通过后将自动发放 credits 与积分" : "Credits & points will be granted after approval"}</div>
        </Card>
      ) : null}

      <Button asChild variant="outline" className="h-12 w-full rounded-[18px] bg-[color:var(--surface)]">
        <Link to="/app/orders">{lang === "zh" ? "返回订单列表" : "Back to orders"}</Link>
      </Button>
    </div>
  );
}

