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

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const store = await demo.getStore();
  const rules = store.rules;
  const bookings = member ? await demo.listBookings({ memberId: member.id }) : [];

  // Options: time slots, studio, photographer. Date will be picked by calendar.
  const slotOptions = ["10:00", "14:00", "18:00"];
  const studios = await demo.listStudios();
  const photographerOptions = ["Photographer 1", "Photographer 2"];

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const initialMonth = today.toISOString().slice(0, 7);
  // Limit to next 60 days for PoC.
  const maxDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return json({
    lang,
    member,
    rules,
    bookings,
    slotOptions,
    studios,
    photographerOptions,
    todayISO,
    initialMonth,
    maxDate
  });
}

/**
 * Demo action: create a booking against demo rules.
 */
export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) return json({ ok: false, message: "Member not found" }, { status: 400 });

  const form = await args.request.formData();
  const date = form.get("date")?.toString();
  const slot = form.get("slot")?.toString();
  const studio = form.get("studio")?.toString() ?? "Studio A";
  const photographer = form.get("photographer")?.toString() ?? "Photographer 1";
  if (!date || !slot) return json({ ok: false, message: "Missing date/slot" }, { status: 400 });

  // slot like "10:00" (interpret as local time for demo).
  const startsAt = new Date(`${date}T${slot}:00`);
  const endsAt = new Date(startsAt.getTime() + 120 * 60 * 1000);

  const result = await demo.createBooking({
    memberId: member.id,
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

export default function BookingPage() {
  const { lang, member, rules, bookings, slotOptions, studios, photographerOptions, todayISO, initialMonth, maxDate } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [month, setMonth] = React.useState(initialMonth);
  const [date, setDate] = React.useState(todayISO);
  const [studio, setStudio] = React.useState(studios[0]?.id ?? "");
  const [photographer, setPhotographer] = React.useState(photographerOptions[0] ?? "");
  const [slot, setSlot] = React.useState(slotOptions[0] ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "bookings")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Select date → studio → photographer → time slot (demo rules enabled)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(lang, "bookingRulesTitle")}</CardTitle>
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
              <span>Next available</span>
              <Badge variant="secondary">Limited</Badge>
            </div>
            <Separator />
            <Form method="post" className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <div className="font-medium">1) Date</div>
                <input type="hidden" name="date" value={date} />
                <div className="mt-2">
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
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <div className="font-medium">2) Studio</div>
                <SelectMenu
                  className="mt-2"
                  name="studio"
                  value={studio}
                  onValueChange={setStudio}
                  options={studios.map((s) => ({ value: s.id, label: `${s.name} · cap ${s.capacityPerSlot}` }))}
                />
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <div className="font-medium">3) Photographer</div>
                <SelectMenu
                  className="mt-2"
                  name="photographer"
                  value={photographer}
                  onValueChange={setPhotographer}
                  options={photographerOptions.map((p) => ({ value: p, label: p }))}
                />
              </div>
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
                <div className="font-medium">4) Time slot</div>
                <input type="hidden" name="slot" value={slot} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {slotOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={
                        s === slot
                          ? "h-11 rounded-xl bg-[color:var(--primary)] text-sm font-medium text-white"
                          : "h-11 rounded-xl border border-[color:var(--border)] bg-white text-sm text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full">
                  {t(lang, "bookNow")}（Demo）
                </Button>
                {actionData && "message" in actionData ? (
                  <div className="mt-2 text-xs text-red-600">{(actionData as any).message}</div>
                ) : null}
                <div className="mt-1 text-xs text-[color:var(--muted)]">
                  Note: membership must be active. If not, go to /app/membership to pay (demo).
                </div>
              </div>
            </Form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My bookings</CardTitle>
          <CardDescription>{member ? member.memberNo : "-"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {bookings.length ? (
            bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
              >
                <div className="flex flex-col">
                  <div className="text-sm font-medium">
                    {b.studio} · {b.photographer}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {b.startsAt} → {b.endsAt}
                  </div>
                </div>
                <Badge variant="secondary">{b.status}</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 text-sm text-[color:var(--muted)]">
              Empty
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
