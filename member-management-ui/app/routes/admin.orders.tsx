import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireAdmin } from "~/lib/session.server";
import { cn } from "~/lib/utils";

type PackageConfig = {
  id: string;
  amount: number;
  currency: "SGD";
  credits: number;
  points: number;
};

const PACKAGES: PackageConfig[] = [
  { id: "PKG-3888-10", amount: 3888, currency: "SGD", credits: 10, points: 38 },
  { id: "PKG-6888-20", amount: 6888, currency: "SGD", credits: 20, points: 68 },
  { id: "PKG-9888-30", amount: 9888, currency: "SGD", credits: 30, points: 98 }
];

function statusBadge(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  await requireAdmin(args.request);
  const demo = getDemoStoreService();
  const store = await demo.getStore();
  const orders = await demo.listTopupOrders();
  return json({ lang, orders, membersById: store.members });
}

export async function action(args: ActionFunctionArgs) {
  await requireAdmin(args.request);
  const demo = getDemoStoreService();
  const form = await args.request.formData();
  const intent = form.get("intent")?.toString() ?? "";
  const orderId = form.get("orderId")?.toString() ?? "";
  if (!orderId) return json({ ok: false, message: "Missing orderId" }, { status: 400 });

  if (intent === "reject") {
    await demo.reviewTopupOrder({ orderId, status: "rejected" });
    return redirect("/admin/orders");
  }

  if (intent === "approve") {
    const pkgId = form.get("packageId")?.toString() ?? "";
    const pkg = PACKAGES.find((p) => p.id === pkgId);
    if (!pkg) return json({ ok: false, message: "Invalid package" }, { status: 400 });
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    await demo.reviewTopupOrder({
      orderId,
      status: "approved",
      grants: { credits: pkg.credits, creditsExpiresAt: expiresAt, points: pkg.points, pointsExpiresAt: expiresAt }
    });
    return redirect("/admin/orders");
  }

  return json({ ok: false, message: "Unknown intent" }, { status: 400 });
}

export default function AdminOrdersPage() {
  const { orders, membersById } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-[color:var(--muted)]">Review top-up proofs and grant credits/points.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top-up orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((o) => {
                  const m = membersById[o.memberId];
                  const pkg = PACKAGES.find((p) => p.id === o.packageId);
                  const canReview = o.status === "submitted";
                  return (
                    <tr key={o.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3 text-[color:var(--muted)]">{o.createdAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{m?.name ?? "Unknown"}</span>
                          <span className="text-xs text-[color:var(--muted)]">{m?.memberNo ?? o.memberId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{o.packageId}</td>
                      <td className="px-4 py-3">
                        {o.amount} {o.currency}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("capitalize", statusBadge(o.status))}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <a className="text-[color:var(--primary)] underline-offset-4 hover:underline" href={o.proofUrl} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Form method="post">
                            <input type="hidden" name="intent" value="approve" />
                            <input type="hidden" name="orderId" value={o.id} />
                            <input type="hidden" name="packageId" value={o.packageId} />
                            <Button size="sm" type="submit" disabled={!canReview || !pkg}>
                              Approve
                            </Button>
                          </Form>
                          <Form method="post">
                            <input type="hidden" name="intent" value="reject" />
                            <input type="hidden" name="orderId" value={o.id} />
                            <Button size="sm" variant="outline" type="submit" disabled={!canReview}>
                              Reject
                            </Button>
                          </Form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[color:var(--muted)]">
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
