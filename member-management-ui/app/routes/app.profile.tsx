import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
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
  return json({ lang, member, membershipStatus, user });
}

export default function ProfilePage() {
  const { lang, member, membershipStatus } = useLoaderData<typeof loader>();
  const isZh = lang === "zh";

  const membershipLabel =
    membershipStatus === "active"
      ? t(lang, "membershipStatusActive")
      : membershipStatus === "expired"
        ? t(lang, "membershipStatusExpired")
        : t(lang, "membershipStatusNone");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "profile")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {isZh ? "个人信息与会员状态" : "Personal info & membership"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "会员状态" : "Membership"}</CardTitle>
          <CardDescription>{isZh ? "用于演示：状态由本地 demo store 生成" : "Demo: state from local store"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-white p-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={member?.avatarUrl ?? "https://www.gravatar.com/avatar/?d=mp"} alt="avatar" />
                <AvatarFallback>MM</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="text-sm font-medium">{member?.name ?? (isZh ? "会员" : "Member")}</div>
                <div className="text-xs text-[color:var(--muted)]">{member?.memberNo ?? "-"}</div>
              </div>
            </div>
            <Badge variant="secondary">{membershipLabel}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm">
              <span>{t(lang, "expiresAt")}</span>
              <span className="text-[color:var(--muted)]">{member?.membershipExpiresAt ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm">
              <span>{t(lang, "memberNo")}</span>
              <span className="text-[color:var(--muted)]">{member?.memberNo ?? "-"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row">
            <Button asChild className="md:w-auto">
              <Link to="/app/membership">{t(lang, "payActivate")}</Link>
            </Button>
            <Button asChild variant="outline" className="md:w-auto">
              <Link to="/app/notifications">{t(lang, "notifications")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "基本资料" : "Basic info"}</CardTitle>
          <CardDescription>{isZh ? "PoC 版本先做展示（暂不保存）" : "PoC: display only (not persisted yet)"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">{isZh ? "名字" : "Name"}</Label>
              <Input id="name" placeholder={member?.name ?? ""} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="phone">{isZh ? "电话" : "Phone"}</Label>
              <Input id="phone" placeholder={member?.phone ?? "+60 ..."} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder={member?.email ?? "name@email.com"} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="gender">{isZh ? "性别" : "Gender"}</Label>
              <Input id="gender" placeholder={isZh ? "（Demo）" : "(Demo)"} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="birthday">{isZh ? "生日" : "Birthday"}</Label>
              <Input id="birthday" placeholder="YYYY-MM-DD" disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="memberNo">{t(lang, "memberNo")}</Label>
              <Input id="memberNo" placeholder={member?.memberNo ?? "MY-2026-000123"} disabled />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="expiry">{t(lang, "expiresAt")}</Label>
              <Input id="expiry" placeholder={member?.membershipExpiresAt?.slice(0, 10) ?? "YYYY-MM-DD"} disabled />
            </div>
          </div>

          <Button disabled>{isZh ? "保存（Demo）" : "Save (Demo)"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "账号" : "Account"}</CardTitle>
          <CardDescription>{isZh ? "退出登录" : "Sign out of this demo session"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Form method="post" action="/logout">
            <Button type="submit" variant="destructive" className="w-full">
              {t(lang, "signOut")}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
