import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getLang } from "~/lib/lang.server";
import type { Lang } from "~/lib/i18n";
import { t } from "~/lib/i18n";
import { getSession, sessionStorage } from "~/lib/session.server";

/**
 * Login page (UI mock).
 * - Simulates Google login by writing a user object into session.
 */
export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  return json({ lang });
}

export async function action(args: ActionFunctionArgs) {
  const session = await getSession(args.request);
  const form = await args.request.formData();
  const role = (form.get("role")?.toString() ?? "member") as "member" | "admin";

  session.set("user", {
    id: "demo-user",
    name: role === "admin" ? "Admin (Demo)" : "Member (Demo)",
    email: role === "admin" ? "admin@example.com" : "member@example.com",
    avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
    role
  });

  return redirect(role === "admin" ? "/admin" : "/app", {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) }
  });
}

function LangSwitch(props: { lang: Lang }) {
  const { lang } = props;
  return (
    <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
      <span>Language:</span>
      <a className={lang === "zh" ? "font-semibold" : ""} href="/lang/zh">
        中文
      </a>
      <span>/</span>
      <a className={lang === "en" ? "font-semibold" : ""} href="/lang/en">
        EN
      </a>
    </div>
  );
}

export default function LoginPage() {
  const { lang } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6">
        <div className="text-[46px] leading-none [font-family:var(--font-display)]" style={{ letterSpacing: "0.06em" }}>
          lux
        </div>
        <div className="mt-6 text-3xl [font-family:var(--font-display)]">{lang === "zh" ? "欢迎回来" : "Welcome back"}</div>
        <div className="mt-2 text-sm text-[color:var(--muted)]">MY · SG · TH</div>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <LangSwitch lang={lang} />

          {/* Email/password (visual only) */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">{lang === "zh" ? "邮箱地址" : "Email"}</Label>
              <Input id="email" placeholder="alex.tan@studio.sg" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{lang === "zh" ? "密码" : "Password"}</Label>
                <a className="text-xs text-[color:var(--primary)]" href="#">
                  {lang === "zh" ? "忘记密码？" : "Forgot?"}
                </a>
              </div>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
          </div>

          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="role" value="member" />
            <Button type="submit" className="h-12 w-full bg-[color:var(--primary)]">
              {lang === "zh" ? "登录（Demo）" : "Sign in (Demo)"}
            </Button>
          </Form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--border)]" />
            <div className="text-xs text-[color:var(--muted)]">{lang === "zh" ? "或" : "or"}</div>
            <div className="h-px flex-1 bg-[color:var(--border)]" />
          </div>

          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="role" value="member" />
            <Button type="submit" variant="outline" className="h-12 w-full bg-[color:var(--surface)]">
              {t(lang, "signInWithGoogle")}
            </Button>
          </Form>

          {/* Admin entrance kept, minimal */}
          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="role" value="admin" />
            <Button type="submit" variant="ghost" className="h-11 w-full text-[color:var(--muted)]">
              Admin Demo
            </Button>
          </Form>

          <p className="text-xs text-[color:var(--muted)]">
            {lang === "zh"
              ? "说明：此版本为 UI 原型，暂不接真实 Google OAuth。"
              : "Note: UI prototype only. Google OAuth is not wired yet."}
          </p>
        </div>
      </Card>
    </div>
  );
}
