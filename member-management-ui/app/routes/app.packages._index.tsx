import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { cn } from "~/lib/utils";
import { SHOOT_PACKAGES } from "~/lib/shoot-packages";

function BackIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={props.className} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  await requireUser(args.request);
  return json({ lang, packages: SHOOT_PACKAGES });
}

export default function PackagesIndexPage() {
  const { lang, packages } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="relative flex items-center justify-center px-1 pt-2">
        <Link
          to="/app"
          className="absolute left-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]"
          aria-label={lang === "zh" ? "返回" : "Back"}
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div className="text-base font-medium">{lang === "zh" ? "拍摄配套" : "Shoot packages"}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-1">
        {packages.map((p) => (
          <Link key={p.id} to={`/app/packages/${p.id}`} className="block">
            <div
              className={cn(
                "overflow-hidden rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)]",
                "transition-transform duration-200 active:scale-[0.985]"
              )}
            >
              <div className="relative aspect-[16/11] w-full">
                <img src={p.bannerUrl} alt={lang === "zh" ? p.titleZh : p.titleEn} className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
              </div>
              <div className="p-3">
                <div className="text-sm font-medium">{lang === "zh" ? p.titleZh : p.titleEn}</div>
                <div className="mt-0.5 text-xs text-[color:var(--muted)]">{lang === "zh" ? p.titleEn : p.titleZh}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

