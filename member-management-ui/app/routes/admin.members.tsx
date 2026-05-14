import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import * as React from "react";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { t } from "~/lib/i18n";
import { Button } from "~/components/ui/button";
import { SelectMenu } from "~/components/ui/select-menu";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const url = new URL(args.request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const dir = url.searchParams.get("dir") ?? "desc";
  const demo = getDemoStoreService();
  const members = await demo.listMembers();
  const filteredByQ = q
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          m.memberNo.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      )
    : members;

  const filtered =
    status === "all" ? filteredByQ : filteredByQ.filter((m) => m.membershipStatus === (status as any));

  const sorted = [...filtered].sort((a, b) => {
    const factor = dir === "asc" ? 1 : -1;
    if (sort === "name") return a.name.localeCompare(b.name) * factor;
    if (sort === "memberNo") return a.memberNo.localeCompare(b.memberNo) * factor;
    if (sort === "expiry") return (a.membershipExpiresAt ?? "").localeCompare(b.membershipExpiresAt ?? "") * factor;
    return a.createdAt.localeCompare(b.createdAt) * factor;
  });

  return json({ lang, q, status, sort, dir, members: sorted });
}

function statusBadge(status: string) {
  if (status === "active") return { label: "active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (status === "expired") return { label: "expired", className: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "inactive", className: "bg-slate-100 text-slate-700 border-slate-200" };
}

export default function AdminMembersPage() {
  const { lang, q, status, sort, dir, members } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const isZh = lang === "zh";

  const [statusValue, setStatusValue] = React.useState(status);

  function buildSortLink(nextSort: string) {
    const sp = new URLSearchParams(searchParams);
    const currentSort = sp.get("sort") ?? "createdAt";
    const currentDir = sp.get("dir") ?? "desc";
    const nextDir = currentSort === nextSort ? (currentDir === "asc" ? "desc" : "asc") : "asc";
    sp.set("sort", nextSort);
    sp.set("dir", nextDir);
    return `?${sp.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "members")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {isZh ? "专业列表：搜索 / 过滤 / 排序 / 状态 / 到期日" : "Search / filter / sort / status / expiry"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "筛选与搜索" : "Filters"}</CardTitle>
          <CardDescription>{isZh ? "支持搜索姓名/手机号/会员号/email" : "Search by name/phone/member no/email"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Form method="get" className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_260px_120px]">
            <Input name="q" placeholder={isZh ? "搜索..." : "Search..."} defaultValue={q} />
            <SelectMenu
              name="status"
              value={statusValue}
              onValueChange={setStatusValue}
              options={[
                { value: "all", label: isZh ? "全部状态" : "All status" },
                { value: "active", label: isZh ? "已开通" : "Active" },
                { value: "expired", label: isZh ? "已到期" : "Expired" },
                { value: "none", label: isZh ? "未开通" : "Inactive" }
              ]}
            />
            <Button type="submit" variant="secondary">
              {isZh ? "应用" : "Apply"}
            </Button>
          </Form>

          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3">
                    <Link to={buildSortLink("memberNo")} className="hover:underline">
                      {isZh ? "会员号" : "Member No"}
                      {sort === "memberNo" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                    </Link>
                  </th>
                  <th className="px-4 py-3">
                    <Link to={buildSortLink("name")} className="hover:underline">
                      {isZh ? "姓名" : "Name"}
                      {sort === "name" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                    </Link>
                  </th>
                  <th className="px-4 py-3">{isZh ? "联系方式" : "Contact"}</th>
                  <th className="px-4 py-3">
                    <Link to={buildSortLink("expiry")} className="hover:underline">
                      {isZh ? "到期日" : "Expiry"}
                      {sort === "expiry" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                    </Link>
                  </th>
                  <th className="px-4 py-3">{isZh ? "状态" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {members.length ? (
                  members.map((m, idx) => {
                    const s = statusBadge(m.membershipStatus);
                    return (
                      <tr key={m.id} className={idx % 2 ? "bg-white" : "bg-[color:var(--bg)]/40"}>
                        <td className="px-4 py-3 font-medium">{m.memberNo}</td>
                        <td className="px-4 py-3">{m.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-[color:var(--muted)]">{m.email}</span>
                            <span className="text-xs text-[color:var(--muted)]">{m.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{m.membershipExpiresAt?.slice(0, 10) ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge className={s.className} variant="outline">
                            {s.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-[color:var(--muted)]">
                      {isZh ? "没有数据" : "No results"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
