import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const demo = getDemoStoreService();
  const store = await demo.getStore();
  const payments = await demo.listPayments();
  const paymentMethods = await demo.listPaymentMethods();
  return json({ lang, payments, membersById: store.members, paymentMethods });
}

/**
 * Demo action: enable/disable payment methods.
 */
export async function action(args: ActionFunctionArgs) {
  const demo = getDemoStoreService();
  const form = await args.request.formData();
  const method = form.get("method")?.toString() as any;
  const enabled = form.get("enabled")?.toString() === "true";
  if (!method) return json({ ok: false }, { status: 400 });
  await demo.setPaymentMethodEnabled({ method, enabled });
  return redirect("/admin/payments");
}

export default function AdminPaymentsPage() {
  const { lang, payments, membersById, paymentMethods } = useLoaderData<typeof loader>();
  const isZh = lang === "zh";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "paymentMethods")}</h1>
        <p className="text-sm text-[color:var(--muted)]">{isZh ? "配置支付方式（开启/关闭）+ 交易列表" : "Configure methods + transactions"}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "支付方式开关" : "Payment method toggles"}</CardTitle>
          <CardDescription>
            {isZh ? "会员端只会展示已开启的方式；关闭后将无法使用该方式开通会员。" : "Member app shows enabled methods only."}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{isZh ? "方式" : "Method"}</th>
                <th className="px-4 py-3">{isZh ? "地区" : "Regions"}</th>
                <th className="px-4 py-3">{isZh ? "状态" : "Status"}</th>
                <th className="px-4 py-3 text-right">{isZh ? "操作" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((m) => (
                <tr key={m.method} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3 font-medium">{m.method}</td>
                  <td className="px-4 py-3 text-[color:var(--muted)]">{m.regions.join("/")}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        m.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }
                    >
                      {m.enabled ? (isZh ? "启用" : "Enabled") : isZh ? "停用" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Form method="post" className="inline-flex">
                      <input type="hidden" name="method" value={m.method} />
                      <input type="hidden" name="enabled" value={String(!m.enabled)} />
                      <Button size="sm" variant={m.enabled ? "outline" : "default"}>
                        {m.enabled ? (isZh ? "关闭" : "Disable") : isZh ? "开启" : "Enable"}
                      </Button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "交易列表" : "Transactions"}</CardTitle>
          <CardDescription>MYR/SGD/THB · Provider: Stripe/iPay88/Billplz/ToyyibPay</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{isZh ? "交易号" : "Transaction"}</th>
                <th className="px-4 py-3">{isZh ? "会员号" : "Member"}</th>
                <th className="px-4 py-3">{isZh ? "金额" : "Amount"}</th>
                <th className="px-4 py-3">{isZh ? "方式" : "Method"}</th>
                <th className="px-4 py-3">{isZh ? "时间" : "Time"}</th>
                <th className="px-4 py-3">{isZh ? "状态" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length ? (
                payments.map((p) => {
                  const member = membersById[p.memberId];
                  const amount =
                    p.currency === "MYR"
                      ? `RM${p.amount}`
                      : p.currency === "SGD"
                        ? `SGD ${p.amount}`
                        : `THB ${p.amount}`;
                  const ok = p.status === "succeeded";
                  return (
                    <tr key={p.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3 font-medium">{p.id}</td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">{member?.memberNo ?? "-"}</td>
                      <td className="px-4 py-3">{amount}</td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">{p.method}</td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">{p.createdAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--muted)]">
                    Empty
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
