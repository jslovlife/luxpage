import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { getLang } from "~/lib/lang.server";
import type { Lang } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  return json({ lang });
}

const COUNTRIES = [
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" }
] as const;

function Title(props: { lang: Lang }) {
  const { lang } = props;
  return (
    <div className="mb-6">
      <div className="text-[46px] leading-none [font-family:var(--font-display)]" style={{ letterSpacing: "0.06em" }}>
        lux
      </div>
      <div className="mt-6 text-3xl [font-family:var(--font-display)]">{lang === "zh" ? "注册账号" : "Create account"}</div>
      <div className="mt-2 text-sm text-[color:var(--muted)]">
        {lang === "zh" ? (
          <>
            已有账号？{" "}
            <Link className="text-[color:var(--primary)] underline-offset-4 hover:underline" to="/signin">
              登录
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link className="text-[color:var(--primary)] underline-offset-4 hover:underline" to="/signin">
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function CheckIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.415l-7.2 7.25a1 1 0 0 1-1.42.006l-3.8-3.75a1 1 0 1 1 1.404-1.424l3.09 3.05 6.49-6.55a1 1 0 0 1 1.43.003Z"
        clipRule="evenodd"
      />
    </svg>
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

export default function RegisterPage() {
  const { lang } = useLoaderData<typeof loader>();
  const [country, setCountry] = React.useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Title lang={lang} />

      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg leading-none">{country.flag}</span>
              <span className="font-medium">{country.name}</span>
            </div>
            <CheckIcon className="h-5 w-5 text-[color:var(--primary)]" />
          </div>

          <div className="flex flex-col gap-2">
            {COUNTRIES.map((c) => {
              const active = c.code === country.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCountry(c)}
                  className={[
                    "flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-sm transition-colors",
                    active
                      ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-white"
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">{c.code}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <Input placeholder={lang === "zh" ? "邮箱地址" : "Email address"} />
          </div>

          <Button size="lg" className="h-12 w-full rounded-[18px] bg-[color:var(--primary)]">
            {lang === "zh" ? "继续" : "Continue"}
          </Button>

          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-[color:var(--border)]" />
            <div className="text-xs text-[color:var(--muted)]">{lang === "zh" ? "或" : "or"}</div>
            <div className="h-px flex-1 bg-[color:var(--border)]" />
          </div>

          <Button variant="outline" size="lg" className="h-12 w-full justify-start gap-3 rounded-[18px] bg-[color:var(--surface)] px-4">
            <span className="grid h-6 w-6 place-items-center">
              <GoogleIcon className="h-5 w-5" />
            </span>
            <span className="flex-1 text-left">{lang === "zh" ? "使用第三方账号继续 Google" : "Continue with Google"}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

