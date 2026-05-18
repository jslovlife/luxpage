import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";

/**
 * "Me" page (profile + points + entry to orders/bookings).
 * Style based on PDF section "06 Me · Points · Orders".
 */
export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const membershipStatus = member ? demo.getMembershipStatus(member) : "none";
  const pointsSummary = member ? await demo.getMemberPointsSummary({ memberId: member.id }) : null;
  const creditsSummary = member ? await demo.getMemberCreditsSummary({ memberId: member.id }) : null;
  const topupOrders = member ? await demo.listTopupOrders({ memberId: member.id }) : [];
  const shootOrders = member ? await demo.listShootOrders({ memberId: member.id }) : [];
  return json({
    lang,
    user,
    member,
    membershipStatus,
    pointsSummary,
    creditsSummary,
    ordersCount: topupOrders.length + shootOrders.length
  });
}

export default function MePage() {
  const { lang, member, membershipStatus, pointsSummary, creditsSummary, ordersCount } = useLoaderData<typeof loader>();
  const name = member?.name ?? (lang === "zh" ? "会员" : "Member");
  const points = pointsSummary?.available ?? 0;
  const expiringCredits = creditsSummary?.expiringCredits ?? 0;
  const nextExpiryAt = creditsSummary?.nextExpiryAt ?? null;
  const nextExpiryDate = nextExpiryAt ? nextExpiryAt.slice(0, 10) : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="px-1">
        <div className="text-sm text-[color:var(--muted)]">{lang === "zh" ? "我的" : "Me"}</div>
        <h1 className="mt-1 text-3xl leading-tight [font-family:var(--font-display)]">{name}</h1>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarImage src={member?.avatarUrl ?? "https://www.gravatar.com/avatar/?d=mp"} alt="avatar" />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-[color:var(--muted)]">{member?.email ?? "-"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{membershipStatus === "active" ? "银卡会员" : "试用"}</Badge>
              <Badge variant="outline">{(member?.country ?? "MY") + " · " + lang}</Badge>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/profile">{lang === "zh" ? "编辑" : "Edit"}</Link>
          </Button>
        </div>
      </Card>

      <div className="rounded-[26px] bg-gradient-to-br from-[#1a1612] to-[#2a231d] p-5 text-white">
        <div className="text-xs opacity-80">{lang === "zh" ? "可用积分" : "Points"}</div>
        <div className="mt-2 flex items-end gap-2">
          <div className="text-5xl leading-none [font-family:var(--font-display)]">{points}</div>
          <div className="pb-1 text-sm opacity-80">pts</div>
        </div>
        {expiringCredits > 0 && nextExpiryDate ? (
          <div className="mt-4">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-[#c8a165]">
              {lang === "zh" ? `${expiringCredits} 个 credit 快过期了` : `${expiringCredits} credits expiring soon`}
            </div>
            <div className="mt-2 text-xs text-white/75">
              {lang === "zh" ? `过期日期：${nextExpiryDate}` : `Expiry date: ${nextExpiryDate}`}
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to="/app/packages"
            className="rounded-[18px] bg-white/10 px-4 py-3 text-sm transition-colors hover:bg-white/15"
          >
            {lang === "zh" ? "我的配套" : "My packages"}
          </Link>
          <Link
            to="/app/booking"
            className="rounded-[18px] bg-white/10 px-4 py-3 text-sm transition-colors hover:bg-white/15"
          >
            {lang === "zh" ? "我的预约" : "My bookings"}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link to="/app/topup">
          <Card className="p-4 transition-colors hover:bg-[color:var(--surface)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{lang === "zh" ? "充值 / 买配套" : "Top up"}</div>
              <div className="text-xs text-[color:var(--muted)]">→</div>
            </div>
          </Card>
        </Link>
        <Link to="/app/orders">
          <Card className="p-4 transition-colors hover:bg-[color:var(--surface)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{lang === "zh" ? "全部订单" : "Orders"}</div>
              <div className="text-xs text-[color:var(--muted)]">{ordersCount ? `${ordersCount} →` : "→"}</div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
