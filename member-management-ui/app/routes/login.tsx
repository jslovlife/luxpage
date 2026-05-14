import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t(lang, "appName")}</CardTitle>
          <CardDescription>MY / SG / TH · Demo UI</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LangSwitch lang={lang} />
          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="role" value="member" />
            <Button type="submit">{t(lang, "signInWithGoogle")}</Button>
          </Form>
          <Form method="post" className="flex flex-col gap-3">
            <input type="hidden" name="role" value="admin" />
            <Button type="submit" variant="outline">
              {t(lang, "signInWithGoogle")}（Admin Demo）
            </Button>
          </Form>
          <p className="text-xs text-[color:var(--muted)]">
            说明：此版本为 UI 原型，不会真正跳转 Google OAuth。后续接入真实 Google Login 时，只需替换本页的 action。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

