import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  json,
  redirect,
  unstable_composeUploadHandlers,
  unstable_createFileUploadHandler,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from "@remix-run/node";
import fs from "node:fs/promises";
import path from "node:path";
import * as React from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { cn } from "~/lib/utils";

type PackageConfig = {
  id: string;
  titleZh: string;
  titleEn: string;
  amount: number;
  currency: "SGD";
  credits: number;
  points: number;
  minLevel: number;
};

const PACKAGES: PackageConfig[] = [
  { id: "PKG-3888-10", titleZh: "3888 元 · 10 个 credit", titleEn: "3888 · 10 credits", amount: 3888, currency: "SGD", credits: 10, points: 38, minLevel: 0 },
  { id: "PKG-6888-20", titleZh: "6888 元 · 20 个 credit", titleEn: "6888 · 20 credits", amount: 6888, currency: "SGD", credits: 20, points: 68, minLevel: 2 },
  { id: "PKG-9888-30", titleZh: "9888 元 · 30 个 credit", titleEn: "9888 · 30 credits", amount: 9888, currency: "SGD", credits: 30, points: 98, minLevel: 3 }
];

function statusBadge(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const points = member ? await demo.getMemberPointsSummary({ memberId: member.id }) : null;
  const creditsSummary = member ? await demo.getMemberCreditsSummary({ memberId: member.id }) : null;
  const orders = member ? await demo.listTopupOrders({ memberId: member.id }) : [];

  return json({
    lang,
    member,
    points,
    creditsBalance: creditsSummary?.balance ?? 0,
    orders,
    packages: PACKAGES
  });
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) return json({ ok: false, message: "Member not found" }, { status: 400 });

  const folder = path.join(process.cwd(), "public", "demo-uploads", "orders");
  await fs.mkdir(folder, { recursive: true });

  const uploadHandler = unstable_createFileUploadHandler({
    directory: folder,
    maxPartSize: 10_000_000,
    file: ({ filename }) => {
      const safe = (filename ?? "proof")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "_")
        .slice(0, 80);
      return `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`;
    }
  });

  const multipart = await unstable_parseMultipartFormData(
    args.request,
    unstable_composeUploadHandlers(uploadHandler, unstable_createMemoryUploadHandler())
  );
  const packageId = multipart.get("packageId")?.toString() ?? "";
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return json({ ok: false, message: "Invalid package" }, { status: 400 });

  const file = multipart.get("proof") as unknown as { name?: string; type?: string };
  if (!file?.name) return json({ ok: false, message: "Missing proof file" }, { status: 400 });
  const proofUrl = `/demo-uploads/orders/${file.name}`;

  const order = await demo.createTopupOrder({
    memberId: member.id,
    packageId: pkg.id,
    amount: pkg.amount,
    currency: "SGD",
    proofUrl
  });

  const rawAuto = process.env.DEMO_AUTO_APPROVE_TOPUP;
  const autoApprove = rawAuto === undefined ? true : rawAuto === "1" || rawAuto === "true";
  if (autoApprove) {
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    await demo.reviewTopupOrder({
      orderId: order.id,
      status: "approved",
      grants: { credits: pkg.credits, creditsExpiresAt: expiresAt, points: pkg.points, pointsExpiresAt: expiresAt }
    });
  }

  return redirect("/app/topup");
}

function levelLabel(level: number, lang: "zh" | "en") {
  if (lang === "zh") return level ? `Lv ${level}` : "Lv 0";
  return level ? `Lv ${level}` : "Lv 0";
}

export default function TopupPage() {
  const { lang, points, creditsBalance, orders, packages } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const level = points?.level ?? 0;

  const [selected, setSelected] = React.useState(packages[0]?.id ?? "");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="px-1 pt-2">
        <div className="flex items-center justify-between">
          <Link to="/app/me" className="text-sm text-[color:var(--muted)]">
            {lang === "zh" ? "返回" : "Back"}
          </Link>
          <div className="text-sm font-medium">{lang === "zh" ? "充值 / 买配套" : "Top up"}</div>
          <div className="w-10" />
        </div>
      </div>

      <div className="rounded-[26px] bg-gradient-to-br from-[#1a1612] to-[#2a231d] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs opacity-80">{lang === "zh" ? "可用 Credit" : "Credits"}</div>
            <div className="mt-2 flex items-end gap-2">
              <div className="text-5xl leading-none [font-family:var(--font-display)]">{Math.max(0, creditsBalance)}</div>
              <div className="pb-1 text-sm opacity-80">credits</div>
            </div>
            <div className="mt-3 text-xs opacity-80">{lang === "zh" ? "1 credit = 1 次拍摄" : "1 credit = 1 session"}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-[#c8a165]">
              {lang === "zh" ? "会员等级" : "Member level"} · {levelLabel(level, lang)}
            </div>
            <div className="text-xs opacity-80">
              {lang === "zh" ? `累计积分：${points?.earnedTotal ?? 0}` : `Earned: ${points?.earnedTotal ?? 0}`}
            </div>
          </div>
        </div>
      </div>

      <Form method="post" encType="multipart/form-data" className="flex flex-col gap-3">
        <div className="px-1 text-sm font-medium">{lang === "zh" ? "选择配套" : "Choose a package"}</div>

        <div className="flex flex-col gap-3">
          {packages.map((p) => {
            const locked = level < p.minLevel;
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={locked}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "w-full rounded-[22px] border px-4 py-4 text-left transition-colors",
                  locked ? "border-[color:var(--border)] bg-[color:var(--bg)] opacity-60" : "border-[color:var(--border)] bg-[color:var(--surface)]",
                  active ? "ring-2 ring-[color:var(--primary)] ring-offset-2 ring-offset-[color:var(--bg)]" : ""
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{lang === "zh" ? p.titleZh : p.titleEn}</div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      {lang === "zh"
                        ? `到账：${p.credits} credits · 获得：${p.points} 积分`
                        : `Grants: ${p.credits} credits · Earn: ${p.points} points`}
                    </div>
                  </div>
                  {locked ? (
                    <Badge variant="outline" className="border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--muted)]">
                      {lang === "zh" ? `需 Lv ${p.minLevel}` : `Lv ${p.minLevel}+`}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{lang === "zh" ? "可购买" : "Available"}</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <input type="hidden" name="packageId" value={selected} />

        <Card className="p-4">
          <div className="text-sm font-medium">{lang === "zh" ? "上传订单凭证" : "Upload proof"}</div>
          <div className="mt-1 text-xs text-[color:var(--muted)]">{lang === "zh" ? "支持 PNG / JPG / PDF" : "PNG / JPG / PDF"}</div>
          <div className="mt-3 flex flex-col gap-2">
            <input
              name="proof"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              className="w-full rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-3 text-sm"
              required
            />
            {actionData?.ok === false ? (
              <div className="text-xs text-rose-700">{actionData.message}</div>
            ) : null}
          </div>
        </Card>

        <Button type="submit" size="lg" className="h-12 w-full rounded-[18px]" disabled={busy}>
          {busy ? (lang === "zh" ? "提交中…" : "Submitting…") : lang === "zh" ? "提交审核" : "Submit"}
        </Button>
      </Form>

      <div className="pt-2">
        <div className="px-1 text-sm font-medium">{lang === "zh" ? "我的订单" : "My orders"}</div>
        <div className="mt-3 flex flex-col gap-3">
          {orders.length ? (
            orders.map((o) => {
              const pkg = packages.find((p) => p.id === o.packageId);
              return (
                <div key={o.id} className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{lang === "zh" ? pkg?.titleZh ?? o.packageId : pkg?.titleEn ?? o.packageId}</div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        {o.amount} {o.currency} · {o.id}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("capitalize", statusBadge(o.status))}>
                      {o.status === "submitted" ? (lang === "zh" ? "待审核" : "Submitted") : o.status === "approved" ? (lang === "zh" ? "已通过" : "Approved") : (lang === "zh" ? "已拒绝" : "Rejected")}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <a className="text-xs text-[color:var(--primary)] underline-offset-4 hover:underline" href={o.proofUrl} target="_blank" rel="noreferrer">
                      {lang === "zh" ? "查看凭证" : "View proof"}
                    </a>
                    <div className="text-xs text-[color:var(--muted)]">
                      {lang === "zh" ? "审核通过后发放 credits 与积分" : "Credits & points are granted after approval"}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">
              {lang === "zh" ? "暂无订单" : "No orders yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
