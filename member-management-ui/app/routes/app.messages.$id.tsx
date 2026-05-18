import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { getLang } from "~/lib/lang.server";

/**
 * Notice detail (editorial reading view).
 */
export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const id = args.params.id ?? "n1";
  return json({ lang, id });
}

export default function MessageDetail() {
  const { lang } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="overflow-hidden">
        <div className="relative h-56 bg-[color:var(--bg)]">
          <div className="absolute left-3 top-3 z-10" style={{ zIndex: 10 }}>
            <Link
              to="/app/messages"
              className="inline-flex size-10 items-center justify-center rounded-full bg-black/20 text-white"
              aria-label="Back"
            >
              ←
            </Link>
          </div>
          <div className="absolute right-3 top-3 z-10" style={{ zIndex: 10 }}>
            <button className="inline-flex size-10 items-center justify-center rounded-full bg-black/20 text-white" aria-label="Save">
              ☆
            </button>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" style={{ pointerEvents: "none" }} />
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[color:var(--muted)]"
            style={{ pointerEvents: "none" }}
          >
            notice · hero
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">活动</Badge>
            <span className="text-xs text-[color:var(--muted)]">5月18日 · 3分钟阅读</span>
          </div>
          <h1 className="mt-3 text-3xl leading-tight [font-family:var(--font-display)]">
            {lang === "zh" ? "5月会员专场：暮光胶片之夜" : "May Member Night: Twilight Film"}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <div className="inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-xs text-[color:var(--primary)]">
              lt
            </div>
            <div>{lang === "zh" ? "lux team · 面向 Singapore" : "lux team · Singapore"}</div>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-7">
            <p>
              {lang === "zh"
                ? "五月的暮光只在 18 日的傍晚停留四十分钟。我们将在乌节路工作室开放限定专场："
                : "Twilight lingers for just forty minutes. We’re opening limited sessions at Orchard Studio:"}
            </p>
            <ul className="list-disc pl-5 text-[color:var(--muted)]">
              <li>{lang === "zh" ? "黄昏胶片（17:00–17:40）" : "Golden film (17:00–17:40)"}</li>
              <li>{lang === "zh" ? "暖光环境拍摄（18:00–19:00）" : "Warm light session (18:00–19:00)"}</li>
              <li>{lang === "zh" ? "限定胶片冲印体验" : "Limited film print experience"}</li>
            </ul>
            <p className="text-[color:var(--muted)]">
              {lang === "zh"
                ? "名额仅限 12 位会员，需预约 60 分。"
                : "Capped at 12 members. Booking required (60 mins)."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
