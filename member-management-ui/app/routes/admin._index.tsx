import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import * as React from "react";
import { Form, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { t } from "~/lib/i18n";
import { SelectMenu } from "~/components/ui/select-menu";
import { Button } from "~/components/ui/button";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const demo = getDemoStoreService();
  const store = await demo.getStore();
  const bookings = await demo.listBookings();
  const albums = await demo.listAlbums();

  const url = new URL(args.request.url);
  const country = (url.searchParams.get("country") ?? "all") as "all" | "MY" | "SG" | "TH";
  const period = (url.searchParams.get("period") ?? "month") as "day" | "month" | "year";
  const valueRaw = url.searchParams.get("value");

  const now = new Date();
  const defaultDay = now.toISOString().slice(0, 10);
  const defaultMonth = now.toISOString().slice(0, 7);
  const defaultYear = String(now.getFullYear());
  const value =
    valueRaw ??
    (period === "day" ? defaultDay : period === "year" ? defaultYear : defaultMonth);

  function rangeFrom(period: string, value: string) {
    if (period === "day") {
      return { start: value.slice(0, 10), end: value.slice(0, 10) };
    }
    if (period === "year") {
      const y = value.slice(0, 4);
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    }
    // month
    const ym = value.slice(0, 7);
    const start = `${ym}-01`;
    const d = new Date(`${ym}-01T00:00:00`);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { start, end: last };
  }

  const { start, end } = rangeFrom(period, value);

  const countries: Array<"MY" | "SG" | "TH"> = ["MY", "SG", "TH"];
  const membersById = store.members;
  const albumsByBookingId = new Map<string, string>();
  for (const a of albums) {
    if (a.bookingId) albumsByBookingId.set(a.bookingId, a.id);
  }

  type Stats = { totalBookings: number; pendingRetouch: number; pendingUploads: number; completed: number };
  const statsByCountry: Record<"MY" | "SG" | "TH", Stats> = {
    MY: { totalBookings: 0, pendingRetouch: 0, pendingUploads: 0, completed: 0 },
    SG: { totalBookings: 0, pendingRetouch: 0, pendingUploads: 0, completed: 0 },
    TH: { totalBookings: 0, pendingRetouch: 0, pendingUploads: 0, completed: 0 }
  };

  const inRange = (d: string) => d >= start && d <= end;

  for (const b of bookings) {
    const day = b.startsAt.slice(0, 10);
    if (!inRange(day)) continue;
    const m = membersById[b.memberId];
    const c = (m?.country ?? "MY") as "MY" | "SG" | "TH";
    statsByCountry[c].totalBookings += 1;
    // waiting photo upload = booking exists but no album delivered yet
    if (!albumsByBookingId.has(b.id)) statsByCountry[c].pendingUploads += 1;
  }

  for (const a of albums) {
    const day = a.shootDate;
    if (!inRange(day)) continue;
    const m = membersById[a.memberId];
    const c = (m?.country ?? "MY") as "MY" | "SG" | "TH";
    if (a.status === "retouch_requested") statsByCountry[c].pendingRetouch += 1;
    if (a.status === "waiting_upload") statsByCountry[c].pendingUploads += 1;
    // completed includes delivered and retouch_done (PoC)
    if (a.status === "delivered" || a.status === "retouch_done") statsByCountry[c].completed += 1;
  }

  const rows = countries
    .filter((c) => (country === "all" ? true : c === country))
    .map((c) => ({ country: c, ...statsByCountry[c] }));
  const total: Stats = rows.reduce(
    (acc, r) => ({
      totalBookings: acc.totalBookings + r.totalBookings,
      pendingRetouch: acc.pendingRetouch + r.pendingRetouch,
      pendingUploads: acc.pendingUploads + r.pendingUploads,
      completed: acc.completed + r.completed
    }),
    { totalBookings: 0, pendingRetouch: 0, pendingUploads: 0, completed: 0 }
  );

  return json({
    lang,
    filters: { country, period, value, start, end, defaultDay, defaultMonth, defaultYear },
    rows,
    total
  });
}

export default function AdminDashboard() {
  const { lang, filters, rows, total } = useLoaderData<typeof loader>();
  const isZh = lang === "zh";
  const [country, setCountry] = React.useState(filters.country);
  const [period, setPeriod] = React.useState(filters.period);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t(lang, "dashboard")}</h1>
          <p className="text-sm text-[color:var(--muted)]">{t(lang, "adminConsole")} · MY/SG/TH</p>
        </div>
        <Badge variant="secondary">Demo</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "filter")}</CardTitle>
          <CardDescription>
            {isZh ? `范围：${filters.start} → ${filters.end}` : `Range: ${filters.start} → ${filters.end}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="get" className="grid grid-cols-1 gap-2 md:grid-cols-[220px_220px_260px_120px]">
            <SelectMenu
              name="country"
              value={country}
              onValueChange={(v) => setCountry(v as any)}
              options={[
                { value: "all", label: t(lang, "allCountries") },
                { value: "MY", label: "MY" },
                { value: "SG", label: "SG" },
                { value: "TH", label: "TH" }
              ]}
            />
            <SelectMenu
              name="period"
              value={period}
              onValueChange={(v) => setPeriod(v as any)}
              options={[
                { value: "day", label: t(lang, "day") },
                { value: "month", label: t(lang, "month") },
                { value: "year", label: t(lang, "year") }
              ]}
            />

            {/* value input */}
            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3">
              <span className="text-xs text-[color:var(--muted)]">{t(lang, "period")}</span>
              <input
                key={period}
                name="value"
                defaultValue={filters.value}
                type={period === "day" ? "date" : period === "month" ? "month" : "number"}
                min={period === "year" ? "2020" : undefined}
                max={period === "year" ? "2100" : undefined}
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <Button type="submit">{t(lang, "apply")}</Button>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "国家汇总" : "By country"}</CardTitle>
          <CardDescription>{isZh ? "总预约数 / 等待精修 / 等待照片上传 / 已完成" : "Total / pending retouch / pending uploads / completed"}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t(lang, "country")}</th>
                <th className="px-4 py-3">{t(lang, "totalBookings")}</th>
                <th className="px-4 py-3">{t(lang, "pendingRetouch")}</th>
                <th className="px-4 py-3">{t(lang, "pendingUploads")}</th>
                <th className="px-4 py-3">{t(lang, "completed")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.country} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3 font-medium">{r.country}</td>
                  <td className="px-4 py-3">{r.totalBookings}</td>
                  <td className="px-4 py-3">{r.pendingRetouch}</td>
                  <td className="px-4 py-3">{r.pendingUploads}</td>
                  <td className="px-4 py-3">{r.completed}</td>
                </tr>
              ))}
              <tr className="border-t border-[color:var(--border)] bg-[color:var(--bg)]/40">
                <td className="px-4 py-3 font-medium">{isZh ? "合计" : "Total"}</td>
                <td className="px-4 py-3">{total.totalBookings}</td>
                <td className="px-4 py-3">{total.pendingRetouch}</td>
                <td className="px-4 py-3">{total.pendingUploads}</td>
                <td className="px-4 py-3">{total.completed}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
