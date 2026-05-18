import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import * as React from "react";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { LanguageToggle } from "~/components/lang-toggle";
import { getLang } from "~/lib/lang.server";
import { signInAdminWithPassword } from "~/lib/auth.server";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  return json({ lang });
}

export async function action(args: ActionFunctionArgs) {
  const form = await args.request.formData();
  const email = form.get("email")?.toString() ?? "";
  const password = form.get("password")?.toString() ?? "";
  const result = await signInAdminWithPassword(args.request, { email, password });
  if (!result.ok) return json({ ok: false, message: result.message }, { status: 400 });
  return redirect(result.redirectTo, { headers: result.headers });
}

export default function AdminLoginPage() {
  const { lang } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-[46px] leading-none [font-family:var(--font-display)]" style={{ letterSpacing: "0.06em" }}>
            lux
          </div>
          <div className="mt-6 text-3xl [font-family:var(--font-display)]">{lang === "zh" ? "管理员登录" : "Admin login"}</div>
          <div className="mt-2 text-sm text-[color:var(--muted)]">MY · SG · TH</div>
        </div>
        <LanguageToggle lang={lang} />
      </div>

      <Card className="p-5">
        <Form method="post" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">{lang === "zh" ? "邮箱地址" : "Email"}</Label>
              <Input id="email" name="email" placeholder="admin@yourcompany.com" autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="password">{lang === "zh" ? "密码" : "Password"}</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
          </div>

          {actionData?.ok === false ? <div className="text-xs text-rose-700">{actionData.message}</div> : null}

          <Button type="submit" className="h-12 w-full bg-[color:var(--primary)]">
            {lang === "zh" ? "登录" : "Sign in"}
          </Button>
        </Form>
      </Card>
    </div>
  );
}

