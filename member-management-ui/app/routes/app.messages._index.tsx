import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { getLang } from "~/lib/lang.server";
import { t } from "~/lib/i18n";

type Notice = {
  id: string;
  tag: string;
  titleZh: string;
  titleEn: string;
  dateLabel: string;
};

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const notices: Notice[] = [
    { id: "n1", tag: "活动", titleZh: "5月会员专场：暮光胶片之夜", titleEn: "May Member Night: Twilight Film", dateLabel: "5月18日" },
    { id: "n2", tag: "门店", titleZh: "新加坡乌节路工作室升级开放", titleEn: "Orchard Studio upgrade", dateLabel: "5月12日" },
    { id: "n3", tag: "配套", titleZh: "夏季肖像配套限时上线", titleEn: "Summer portrait package", dateLabel: "5月09日" }
  ];
  return json({ lang, notices });
}

export default function MessagesIndexPage() {
  const { lang, notices } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="px-1">
        <div className="text-sm text-[color:var(--muted)]">{t(lang, "messages")}</div>
        <h1 className="mt-1 text-3xl leading-tight [font-family:var(--font-display)]">This week</h1>
        <div className="mt-1 text-sm text-[color:var(--muted)]">Announcements & campaigns</div>
      </div>

      <div className="flex flex-col gap-3">
        {notices.map((n) => (
          <Link key={n.id} to={`/app/messages/${n.id}`} className="block">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="size-14 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--bg)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{n.tag}</Badge>
                    <span className="text-xs text-[color:var(--muted)]">{n.dateLabel}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium">{lang === "zh" ? n.titleZh : n.titleEn}</div>
                </div>
                <div className="text-[color:var(--muted)]">→</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

