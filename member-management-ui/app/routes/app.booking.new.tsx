import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import * as React from "react";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { t } from "~/lib/i18n";
import { Separator } from "~/components/ui/separator";
import { SelectMenu } from "~/components/ui/select-menu";
import { MonthCalendar } from "~/components/calendar/month-calendar";
import { cn } from "~/lib/utils";
import { SHOOT_PACKAGES, getShootPackage } from "~/lib/shoot-packages";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const store = await demo.getStore();
  const rules = store.rules;
  const url = new URL(args.request.url);
  const shootOrderId = url.searchParams.get("shootOrderId") ?? "";
  let packageId = url.searchParams.get("packageId") ?? SHOOT_PACKAGES[0]?.id ?? "";
  if (shootOrderId && member) {
    const orders = await demo.listShootOrders({ memberId: member.id });
    const found = orders.find((o) => o.id === shootOrderId);
    if (found) packageId = found.packageId;
  }
  const creditsSummary = member ? await demo.getMemberCreditsSummary({ memberId: member.id }) : null;

  const slotOptions = ["10:00", "14:00", "18:00"];
  const studios = await demo.listStudios();
  const photographerOptions = ["Photographer 1", "Photographer 2"];

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const initialMonth = today.toISOString().slice(0, 7);
  const maxDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return json({
    lang,
    member,
    rules,
    packages: SHOOT_PACKAGES,
    packageId,
    shootOrderId,
    creditsBalance: creditsSummary?.balance ?? 0,
    slotOptions,
    studios,
    photographerOptions,
    todayISO,
    initialMonth,
    maxDate
  });
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) return json({ ok: false, message: "Member not found" }, { status: 400 });

  const form = await args.request.formData();
  const shootOrderId = form.get("shootOrderId")?.toString() ?? "";
  const packageId = form.get("packageId")?.toString() ?? "";
  const date = form.get("date")?.toString();
  const slot = form.get("slot")?.toString();
  const studio = form.get("studio")?.toString() ?? "Studio A";
  const photographer = form.get("photographer")?.toString() ?? "Photographer 1";
  if (!packageId) return json({ ok: false, message: "Missing package" }, { status: 400 });
  const pkg = getShootPackage(packageId);
  if (!pkg) return json({ ok: false, message: "Invalid package" }, { status: 400 });
  if (!date || !slot) return json({ ok: false, message: "Missing date/slot" }, { status: 400 });

  const startsAt = new Date(`${date}T${slot}:00`);
  const endsAt = new Date(startsAt.getTime() + 120 * 60 * 1000);

  const result = shootOrderId
    ? await demo.rescheduleShootOrder({
        memberId: member.id,
        shootOrderId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        studio,
        photographer
      })
    : await demo.placeShootOrder({
        memberId: member.id,
        packageId: pkg.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        studio,
        photographer
      });

  if (!result.ok) {
    return json({ ok: false, message: result.reason }, { status: 400 });
  }

  return redirect("/app/booking");
}

export default function BookingNewPage() {
  const { lang, rules, packages, packageId: initialPackageId, shootOrderId, creditsBalance, slotOptions, studios, photographerOptions, todayISO, initialMonth, maxDate } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [month, setMonth] = React.useState(initialMonth);
  const [date, setDate] = React.useState(todayISO);
  const [studio, setStudio] = React.useState(studios[0]?.id ?? "");
  const [photographer, setPhotographer] = React.useState(photographerOptions[0] ?? "");
  const [slot, setSlot] = React.useState(slotOptions[0] ?? "");
  const [packageId, setPackageId] = React.useState(initialPackageId);

  const selectedPackage = React.useMemo(() => packages.find((p) => p.id === packageId) ?? null, [packages, packageId]);
  const requiredCredits = selectedPackage?.credits ?? 0;
  const isReschedule = Boolean(shootOrderId);
  const canSubmit = requiredCredits > 0 && (isReschedule || creditsBalance >= requiredCredits);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="px-1">
        <div className="text-sm text-[color:var(--muted)]">{t(lang, "bookings")}</div>
        <h1 className="mt-1 text-3xl leading-tight [font-family:var(--font-display)]">
          {isReschedule ? (lang === "zh" ? "改期" : "Reschedule") : lang === "zh" ? "下单拍摄" : "Place order"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="[font-family:var(--font-display)]">{t(lang, "bookingRulesTitle")}</CardTitle>
          <CardDescription>
            {t(lang, "ruleMinGap")} · {t(lang, "ruleMaxDuration")} · capacity/slot
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-xs text-[color:var(--muted)]">
            Current demo rules: minGapDays={rules.minGapDays} · maxDurationMinutes={rules.maxDurationMinutes} ·
            capacityPerSlot={rules.capacityPerSlot}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[color:var(--muted)]">{lang === "zh" ? "日历与时段" : "Calendar & slot"}</span>
              <Badge variant="secondary">Limited</Badge>
            </div>
            <Separator />
            <Form method="post" className="flex flex-col gap-3">
              <input type="hidden" name="shootOrderId" value={shootOrderId} />
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium">{lang === "zh" ? "选择拍摄配套" : "Choose shoot package"}</div>
                  <div className="flex flex-col items-end gap-1 text-xs text-[color:var(--muted)]">
                    <div>{lang === "zh" ? `可用：${creditsBalance} credits` : `Available: ${creditsBalance} credits`}</div>
                    {requiredCredits ? (
                      <div>{lang === "zh" ? `所需：${requiredCredits} credits` : `Required: ${requiredCredits} credits`}</div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <SelectMenu
                    name="packageId"
                    value={packageId}
                    onValueChange={setPackageId}
                    options={packages.map((p) => ({
                      value: p.id,
                      label: lang === "zh" ? `${p.titleZh} · ${p.credits} credit` : `${p.titleEn} · ${p.credits} credit`
                    }))}
                  />
                </div>
                {!canSubmit && !isReschedule ? (
                  <div className="mt-3 text-xs text-rose-700">
                    {lang === "zh" ? "Credit 不足，先去充值/买配套。" : "Not enough credits. Please top up first."}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{month.replace("-", lang === "zh" ? "月 " : " / ")}</div>
                  <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <span>{lang === "zh" ? "选择日期" : "Select date"}</span>
                  </div>
                </div>
                <input type="hidden" name="date" value={date} />
                <div className="mt-3">
                  <MonthCalendar
                    month={month}
                    selected={date}
                    minDate={todayISO}
                    maxDate={maxDate}
                    onChangeMonth={setMonth}
                    onSelect={setDate}
                  />
                </div>
              </div>

              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="text-sm font-medium">{lang === "zh" ? "摄影棚与摄影师" : "Studio & photographer"}</div>
                <div className="mt-3 flex flex-col gap-3">
                  <SelectMenu
                    name="studio"
                    value={studio}
                    onValueChange={setStudio}
                    options={studios.map((s) => ({ value: s.id, label: `${s.name} · cap ${s.capacityPerSlot}` }))}
                  />
                  <SelectMenu
                    name="photographer"
                    value={photographer}
                    onValueChange={setPhotographer}
                    options={photographerOptions.map((p) => ({ value: p, label: p }))}
                  />
                </div>
              </div>

              <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <div className="text-sm font-medium">{lang === "zh" ? "选择时段" : "Pick a slot"}</div>
                <input type="hidden" name="slot" value={slot} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {slotOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={cn(
                        "h-12 rounded-full text-sm transition-colors",
                        s === slot
                          ? "bg-[color:var(--text)] text-white"
                          : "border border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)] hover:bg-[color:var(--surface)]"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="h-12 w-full" disabled={!canSubmit}>
                {isReschedule
                  ? lang === "zh"
                    ? "确认改期"
                    : "Confirm reschedule"
                  : lang === "zh"
                    ? `使用 ${requiredCredits} credits 下单`
                    : `Place order with ${requiredCredits} credits`}
              </Button>
              {actionData && "message" in actionData ? (
                <div className="text-xs text-red-600">{(actionData as any).message}</div>
              ) : null}
              <div className="text-xs text-[color:var(--muted)]">
                {lang === "zh"
                  ? "提示：真实系统会在服务端校验会员状态与规则（7天间隔、2小时上限、名额）。"
                  : "Note: In production, server enforces membership + rules (7-day gap, 2h max, capacity)."}
              </div>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
