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
  const studios = await demo.listStudios({ includeInactive: true });

  const url = new URL(args.request.url);
  const studio = url.searchParams.get("studio") ?? "all";
  const photographer = url.searchParams.get("photographer") ?? "all";
  const start = url.searchParams.get("start") ?? new Date().toISOString().slice(0, 10);
  const weeks = Math.min(8, Math.max(1, Number(url.searchParams.get("weeks") ?? "4") || 4));

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(startDate.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  const endISO = new Date(endDate.getTime() - 1).toISOString().slice(0, 10);

  const dates = Array.from({ length: weeks * 7 }).map((_, i) => {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });

  const allBookings = await demo.listBookings();
  const bookings = allBookings.filter((b) => {
    const day = b.startsAt.slice(0, 10);
    if (day < start || day > endISO) return false;
    if (studio !== "all" && b.studio !== studio) return false;
    if (photographer !== "all" && b.photographer !== photographer) return false;
    return true;
  });

  const photographers = ["Photographer 1", "Photographer 2"];

  const membersById = store.members;
  const studiosById = store.studios ?? {};
  return json({
    lang,
    bookings,
    membersById,
    studios,
    studiosById,
    photographers,
    filters: { studio, photographer, start, weeks },
    dates,
    rules: store.rules
  });
}

export default function AdminBookingsPage() {
  const { lang, bookings, membersById, studios, studiosById, photographers, filters, dates, rules } =
    useLoaderData<typeof loader>();
  const isZh = lang === "zh";

  const [studio, setStudio] = React.useState(filters.studio);
  const [photographer, setPhotographer] = React.useState(filters.photographer);
  const [weeks, setWeeks] = React.useState(String(filters.weeks));

  function studioName(idOrName: string) {
    return studiosById[idOrName]?.name ?? idOrName;
  }

  function hexToRgba(hex: string, alpha: number) {
    const h = hex.replace("#", "").trim();
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = Number.parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function studioColor(studioId: string) {
    return studiosById[studioId]?.color ?? "#2563eb";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "bookings")}</h1>
        <p className="text-sm text-[color:var(--muted)]">{isZh ? "日历排班视图（可筛选）" : "Scheduler view (filterable)"}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "筛选条件" : "Filters"}</CardTitle>
          <CardDescription>
            {isZh ? "可按 studio / 摄影师 / 起始日期 / 周数筛选" : "Filter by studio / photographer / start date / weeks"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="get" className="grid grid-cols-1 gap-2 md:grid-cols-[260px_240px_220px_160px_120px]">
            <SelectMenu
              name="studio"
              value={studio}
              onValueChange={setStudio}
              options={[
                { value: "all", label: isZh ? "全部 Studio" : "All studios" },
                ...studios.map((s) => ({ value: s.id, label: `${s.name} · cap ${s.capacityPerSlot}${s.active ? "" : " (inactive)"}` }))
              ]}
            />
            <SelectMenu
              name="photographer"
              value={photographer}
              onValueChange={setPhotographer}
              options={[
                { value: "all", label: isZh ? "全部摄影师" : "All photographers" },
                ...photographers.map((p) => ({ value: p, label: p }))
              ]}
            />
            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3">
              <span className="text-xs text-[color:var(--muted)]">{isZh ? "开始" : "Start"}</span>
              <input
                name="start"
                type="date"
                defaultValue={filters.start}
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <SelectMenu
              name="weeks"
              value={weeks}
              onValueChange={setWeeks}
              options={[
                { value: "1", label: isZh ? "1 周" : "1 week" },
                { value: "2", label: isZh ? "2 周" : "2 weeks" },
                { value: "4", label: isZh ? "4 周" : "4 weeks" },
                { value: "8", label: isZh ? "8 周" : "8 weeks" }
              ]}
            />
            <Button type="submit">
              {isZh ? "应用" : "Apply"}
            </Button>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "Calendar view" : "Calendar view"}</CardTitle>
          <CardDescription>{isZh ? "行=日期，列=摄影师（资源视图）" : "Rows=dates, columns=photographers (resource view)"}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
            <span>{isZh ? "颜色按 Studio 区分：" : "Colors by studio:"}</span>
            {studios.slice(0, 6).map((s) => {
              return (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </span>
              );
            })}
          </div>

          <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 bg-[color:var(--surface)]">
              <tr>
                <th className="w-32 border-b border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-left text-xs text-[color:var(--muted)]">
                  {isZh ? "日期" : "Date"}
                </th>
                {photographers.map((p) => (
                  <th
                    key={p}
                    className="border-b border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-left text-xs text-[color:var(--muted)]"
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d, idx) => {
                const zebra = idx % 2 ? "bg-white" : "bg-[color:var(--bg)]/40";
                return (
                  <tr key={d} className={zebra}>
                    <td className="border-b border-[color:var(--border)] px-3 py-2 align-top">
                      <div className="text-xs text-[color:var(--muted)]">{d}</div>
                    </td>
                    {photographers.map((p) => {
                      const cells = bookings.filter((b) => b.startsAt.slice(0, 10) === d && b.photographer === p);
                      return (
                        <td key={p} className="border-b border-[color:var(--border)] px-2 py-2 align-top">
                          <div className="flex flex-col gap-2">
                            {cells.map((b) => {
                              const member = membersById[b.memberId];
                              const color = studioColor(b.studio);
                              return (
                                <div
                                  key={b.id}
                                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2"
                                  style={{
                                    borderLeftWidth: 4,
                                    borderLeftStyle: "solid",
                                    borderLeftColor: color
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-medium">
                                      {b.startsAt.slice(11, 16)}–{b.endsAt.slice(11, 16)}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] border-[color:var(--border)]"
                                      style={{ backgroundColor: hexToRgba(color, 0.12), color }}
                                    >
                                      {b.status}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-[color:var(--muted)]">
                                    <div>
                                      <span className="font-medium text-[color:var(--text)]">
                                        {member?.name ?? "Unknown"}
                                      </span>{" "}
                                      <span>· {member?.phone ?? "-"}</span>
                                    </div>
                                    <div>
                                      {studioName(b.studio)} · {b.photographer}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {!cells.length ? (
                              <div className="h-14 rounded-xl border border-dashed border-[color:var(--border)] bg-transparent" />
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
