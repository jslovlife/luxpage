import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
  const payments = member ? await demo.listPayments({ memberId: member.id }) : [];
  const paymentMethods = await demo.listPaymentMethods();
  return json({
    lang,
    member,
    membershipStatus,
    latestPayment: payments[0] ?? null,
    paymentMethods
  });
}

function membershipStatusLabel(lang: Parameters<typeof t>[0], status: "none" | "active" | "expired") {
  if (status === "active") return t(lang, "membershipStatusActive");
  if (status === "expired") return t(lang, "membershipStatusExpired");
  return t(lang, "membershipStatusNone");
}

/**
 * Demo action: simulate payment success and activate membership.
 */
export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) return json({ ok: false, message: "Member not found" }, { status: 400 });

  const form = await args.request.formData();
  const method = (form.get("method")?.toString() ?? "FPX") as
    | "FPX"
    | "Credit Card"
    | "DuitNow"
    | "TNG eWallet";

  try {
    await demo.payAndActivateMembership({
      memberId: member.id,
      amount: 3888,
      currency: "MYR",
      method
    });
  } catch (e) {
    return json({ ok: false, message: (e as Error).message }, { status: 400 });
  }

  return redirect("/app/membership");
}

export default function MembershipPage() {
  const { lang, member, membershipStatus, latestPayment, paymentMethods } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const isZh = lang === "zh";

  const enabledMethods = paymentMethods.filter((m) => m.enabled);
  const defaultMethod = enabledMethods[0]?.method ?? "FPX";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t(lang, "membershipFee")}</h1>
          <p className="text-sm text-[color:var(--muted)]">{isZh ? "开通会员后可预约拍摄与查看交付" : "Activate membership to book and access deliveries"}</p>
        </div>
        <Badge variant="secondary">RM3888</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "会员状态" : "Membership status"}</CardTitle>
          <CardDescription>{isZh ? "PoC 版本（本地持久化 demo 数据）" : "PoC version (local persisted demo store)"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span>{isZh ? "状态" : "Status"}</span>
            <Badge variant="secondary">{membershipStatusLabel(lang, membershipStatus)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>{t(lang, "memberNo")}</span>
            <span className="text-[color:var(--muted)]">{member ? member.memberNo : "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t(lang, "expiresAt")}</span>
            <span className="text-[color:var(--muted)]">{member?.membershipExpiresAt ?? "-"}</span>
          </div>
          {latestPayment ? (
            <div className="text-xs text-[color:var(--muted)]">
              {isZh ? "最近支付" : "Latest payment"}: {latestPayment.id} · {latestPayment.status} · {latestPayment.method}
            </div>
          ) : null}
          {actionData && "message" in actionData ? (
            <div className="text-xs text-red-600">{(actionData as any).message}</div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "无限预约拍摄会员" : "Unlimited shoots membership"}</CardTitle>
          <CardDescription>{isZh ? "支持多种支付方式（Demo）" : "Multiple payment methods (Demo)"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm">
            <div className="font-medium">{t(lang, "paymentMethods")}</div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {enabledMethods.map((m) => (
                <div key={m.method} className="flex items-center justify-between rounded-xl bg-white p-3">
                  <span className="text-sm">
                    {m.method}
                  </span>
                  <Badge variant="outline">{m.regions.join("/")}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Providers: iPay88 / Billplz / ToyyibPay / Stripe Malaysia（后续接真实支付）
            </p>
          </div>

          <Form method="post" className="flex flex-col gap-2">
            <input type="hidden" name="method" value={defaultMethod} />
            <Button type="submit" disabled={!enabledMethods.length}>
              {!enabledMethods.length ? (isZh ? "暂无可用支付方式" : "No available methods") : isZh ? "立即支付（Demo）" : "Pay now (Demo)"}
            </Button>
          </Form>
          <Button variant="outline" asChild>
            <Link to="/app/profile">{isZh ? "完善资料" : "Complete profile"}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
