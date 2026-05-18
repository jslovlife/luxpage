import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getLang } from "~/lib/lang.server";
import type { Lang } from "~/lib/i18n";
import { getSession, sessionStorage } from "~/lib/session.server";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  return json({ lang });
}

export async function action(args: ActionFunctionArgs) {
  const session = await getSession(args.request);
  const form = await args.request.formData();
  const email = form.get("email")?.toString() ?? "alex.tan@studio.sg";

  session.set("user", {
    id: "demo-user",
    name: "Alex Tan",
    email,
    avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
    role: "member"
  });

  return redirect("/app", {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) }
  });
}

function Brand() {
  return (
    <div className="text-[46px] leading-none [font-family:var(--font-display)]" style={{ letterSpacing: "0.06em" }}>
      lux
    </div>
  );
}

function Copy(props: { lang: Lang }) {
  const { lang } = props;
  return (
    <div className="mt-6">
      <div className="text-3xl [font-family:var(--font-display)]">{lang === "zh" ? "欢迎回来" : "Welcome back"}</div>
      <div className="mt-2 text-sm text-[color:var(--muted)]">
        {lang === "zh" ? (
          <>
            还没有账号？{" "}
            <Link className="text-[color:var(--primary)] underline-offset-4 hover:underline" to="/register">
              注册
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link className="text-[color:var(--primary)] underline-offset-4 hover:underline" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.24 3.6l6.9-6.9C35.94 2.38 30.4 0 24 0 14.62 0 6.5 5.38 2.56 13.22l8.02 6.22C12.5 13.02 17.78 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.64-.14-2.86-.44-4.12H24v7.8h12.94c-.26 2.02-1.66 5.06-4.78 7.1l7.36 5.7c4.4-4.06 6.98-10.02 6.98-17.48z" />
      <path fill="#FBBC05" d="M10.58 28.44c-.5-1.5-.78-3.1-.78-4.74s.28-3.24.76-4.74l-8.02-6.22C.92 15.86 0 19.82 0 23.7c0 3.88.92 7.84 2.54 11.26l8.04-6.22z" />
      <path fill="#34A853" d="M24 48c6.4 0 11.78-2.12 15.7-5.76l-7.36-5.7c-2 1.4-4.68 2.38-8.34 2.38-6.22 0-11.5-3.52-13.42-8.44l-8.04 6.22C6.5 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AppleIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.66 13.1c.02 2.3 2.02 3.06 2.04 3.07-.02.05-.32 1.1-1.05 2.16-.64.92-1.3 1.84-2.35 1.86-1.03.02-1.36-.62-2.54-.62-1.18 0-1.55.6-2.53.64-1 .04-1.77-1-2.41-1.92-1.31-1.9-2.32-5.37-.97-7.72.67-1.16 1.86-1.89 3.16-1.91 1-.02 1.93.68 2.54.68.61 0 1.76-.84 2.97-.72.5.02 1.9.2 2.8 1.5-.07.04-1.67.97-1.66 2.98z" />
      <path d="M14.7 4.2c.53-.64.9-1.54.8-2.42-.77.03-1.7.52-2.25 1.16-.49.56-.92 1.47-.8 2.33.86.07 1.72-.44 2.25-1.07z" />
    </svg>
  );
}

function FacebookIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H8.08V12h2.36V9.8c0-2.33 1.39-3.62 3.52-3.62 1.02 0 2.08.18 2.08.18v2.28h-1.17c-1.15 0-1.51.71-1.51 1.44V12h2.57l-.41 2.89h-2.16v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function SocialButton(props: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={[
        "h-12 w-full justify-start gap-3 rounded-[18px] bg-[color:var(--surface)] px-4",
        props.className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="grid h-6 w-6 place-items-center">{props.icon}</span>
      <span className="flex-1 text-left">{props.children}</span>
    </Button>
  );
}

export default function SignInPage() {
  const { lang } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center px-5 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-md">
          <Brand />
          <Copy lang={lang} />

          <Card className="mt-7 p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="email">{lang === "zh" ? "邮箱地址" : "Email"}</Label>
                  <Input
                    id="email"
                    name="email"
                    defaultValue="alex.tan@studio.sg"
                    placeholder="alex.tan@studio.sg"
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{lang === "zh" ? "密码" : "Password"}</Label>
                    <a className="text-xs text-[color:var(--muted)] underline-offset-4 hover:underline" href="#">
                      {lang === "zh" ? "忘记密码？" : "Forgot password?"}
                    </a>
                  </div>
                  <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
                </div>
              </div>

              <Form method="post" className="flex flex-col gap-3">
                <Button type="submit" size="lg" className="w-full rounded-[18px] bg-[color:var(--primary)]">
                  {lang === "zh" ? "登录（Demo）" : "Sign in (Demo)"}
                </Button>
              </Form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[color:var(--border)]" />
                <div className="text-xs text-[color:var(--muted)]">{lang === "zh" ? "或" : "or"}</div>
                <div className="h-px flex-1 bg-[color:var(--border)]" />
              </div>

              <div className="flex flex-col gap-3">
                <SocialButton icon={<GoogleIcon className="h-5 w-5" />}>
                  {lang === "zh" ? "使用第三方账号继续 Google" : "Continue with Google"}
                </SocialButton>
                <SocialButton icon={<AppleIcon className="h-5 w-5" />} className="text-[color:var(--text)]">
                  {lang === "zh" ? "使用第三方账号继续 Apple" : "Continue with Apple"}
                </SocialButton>
                <SocialButton icon={<FacebookIcon className="h-5 w-5 text-[#1877F2]" />}>
                  {lang === "zh" ? "使用第三方账号继续 Facebook" : "Continue with Facebook"}
                </SocialButton>
              </div>

              <p className="text-xs text-[color:var(--muted)]">
                {lang === "zh" ? "说明：此版本为 UI 原型，暂不接真实登录。" : "Note: UI prototype only. Authentication is not wired yet."}
              </p>
            </div>
          </Card>
        </div>

        <div className="hidden lg:block">
          <Card className="h-full p-6">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="text-sm text-[color:var(--muted)]">{lang === "zh" ? "02 Onboarding" : "02 Onboarding"}</div>
                <div className="mt-3 text-2xl [font-family:var(--font-display)]">{lang === "zh" ? "注册 · 国家 + SSO" : "Register · Country + SSO"}</div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {lang === "zh"
                    ? "注册流程将在 /register 中展示（UI 原型）。"
                    : "The registration flow is available at /register (UI prototype)."}
                </p>
              </div>

              <Button asChild size="lg" className="mt-8 w-full rounded-[18px] bg-[color:var(--primary)]">
                <Link to="/register">{lang === "zh" ? "去注册" : "Go to sign up"}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
