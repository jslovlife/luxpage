import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { getShootPackage } from "~/lib/shoot-packages";
import { getDemoStoreService } from "~/lib/demo-store.server";

function BackIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function CheckIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const id = args.params.packageId ?? "";
  const pkg = getShootPackage(id);
  if (!pkg) throw new Response("Not Found", { status: 404 });
  const creditsSummary = member ? await demo.getMemberCreditsSummary({ memberId: member.id }) : null;
  return json({ lang, pkg, creditsBalance: creditsSummary?.balance ?? 0 });
}

export default function PackageDetailPage() {
  const { lang, pkg, creditsBalance } = useLoaderData<typeof loader>();
  const canOrder = creditsBalance >= pkg.credits;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="relative flex items-center justify-center px-1 pt-2">
        <Link
          to="/app/packages"
          className="absolute left-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
          aria-label={lang === "zh" ? "返回" : "Back"}
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div className="text-base font-medium">{lang === "zh" ? "配套详情" : "Package details"}</div>
      </div>

      <Card className="overflow-hidden">
        <div className="relative aspect-[16/11] w-full">
          <img src={pkg.bannerUrl} alt={lang === "zh" ? pkg.titleZh : pkg.titleEn} className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/0" />
          <div className="absolute inset-x-4 bottom-4 text-white">
            <div className="text-[22px] leading-snug [font-family:var(--font-display)]">{lang === "zh" ? pkg.titleZh : pkg.titleEn}</div>
            <div className="mt-1 text-xs opacity-85">{lang === "zh" ? pkg.titleEn : pkg.titleZh}</div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{lang === "zh" ? "价格" : "Price"}</div>
              <div className="mt-1 text-[18px] [font-family:var(--font-display)]">{pkg.price}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{lang === "zh" ? "所需" : "Credits"}</div>
              <div className="mt-1 text-[18px] [font-family:var(--font-display)]">{pkg.credits}</div>
              <div className="mt-0.5 text-xs text-[color:var(--muted)]">{lang === "zh" ? "credit / 次" : "credit / session"}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
              <div className="text-[10px] text-[color:var(--muted)]">{lang === "zh" ? "拍摄时长" : "Duration"}</div>
              <div className="mt-1 text-sm font-medium">{pkg.duration}</div>
            </div>
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-3">
              <div className="text-[10px] text-[color:var(--muted)]">{lang === "zh" ? "类型" : "Type"}</div>
              <div className="mt-1 text-sm font-medium">{lang === "zh" ? "拍摄配套" : "Shoot package"}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium">{lang === "zh" ? "配套亮点" : "Highlights"}</div>
            <div className="mt-2 flex flex-col gap-2">
              {(lang === "zh" ? pkg.highlightsZh : pkg.highlightsEn).map((h) => (
                <div key={h} className="flex items-start gap-2 text-sm text-[color:var(--muted)]">
                  <div className="mt-0.5 grid size-5 place-items-center rounded-full bg-[color:var(--primary-soft)] text-[color:var(--primary)]">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-[color:var(--text)]">{h}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium">{lang === "zh" ? "备注" : "Notes"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(lang === "zh" ? pkg.notesZh : pkg.notesEn).map((n) => (
                <Badge key={n} variant="outline" className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]">
                  {n}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="pt-1">
        <div className="flex flex-col gap-2">
          {canOrder ? (
            <Button asChild size="lg" className="h-12 w-full rounded-[18px]">
              <Link to={`/app/booking/new?packageId=${encodeURIComponent(pkg.id)}`}>
                {lang === "zh" ? `使用 ${pkg.credits} credits 下单` : `Place order with ${pkg.credits} credits`}
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="h-12 w-full rounded-[18px]" disabled>
              {lang === "zh" ? `需要 ${pkg.credits} credits（当前 ${creditsBalance}）` : `Requires ${pkg.credits} credits (you have ${creditsBalance})`}
            </Button>
          )}
          {!canOrder ? (
            <Button asChild variant="outline" className="h-12 w-full rounded-[18px] bg-[color:var(--surface)]">
              <Link to="/app/topup">{lang === "zh" ? "Credit 不足，先去买" : "Not enough credits, top up"}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
