import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import * as React from "react";
import { Form, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const demo = getDemoStoreService();
  const studios = await demo.listStudios({ includeInactive: true });
  return json({ lang, studios });
}

export async function action(args: ActionFunctionArgs) {
  const demo = getDemoStoreService();
  const form = await args.request.formData();
  const intent = form.get("intent")?.toString() ?? "createStudio";

  if (intent === "createStudio") {
    const name = form.get("name")?.toString() ?? "";
    const cap = Number(form.get("capacityPerSlot"));
    await demo.createStudio({ name, capacityPerSlot: Number.isFinite(cap) ? cap : 1 });
    return redirect("/admin/studios");
  }

  if (intent === "deleteStudio") {
    const id = form.get("id")?.toString() ?? "";
    await demo.deleteStudio({ id });
    return redirect("/admin/studios");
  }

  // updateStudio (includes toggle)
  const id = form.get("id")?.toString() ?? "";
  const name = form.get("name")?.toString();
  const cap = Number(form.get("capacityPerSlot"));
  const activeRaw = form.get("active")?.toString();
  const active = activeRaw === undefined ? undefined : activeRaw === "true";
  await demo.updateStudio({ id, name, capacityPerSlot: Number.isFinite(cap) ? cap : undefined, active });
  return redirect("/admin/studios");
}

export default function AdminStudiosPage() {
  const { lang, studios } = useLoaderData<typeof loader>();
  const isZh = lang === "zh";

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; capacityPerSlot: string }>({ name: "", capacityPerSlot: "2" });

  function startEdit(studio: (typeof studios)[number]) {
    setEditingId(studio.id);
    setDraft({ name: studio.name, capacityPerSlot: String(studio.capacityPerSlot) });
  }
  function cancelEdit() {
    setEditingId(null);
  }

  function Toggle(props: { id: string; active: boolean }) {
    const { id, active } = props;
    return (
      <Form method="post" className="inline-flex">
        <input type="hidden" name="intent" value="updateStudio" />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(!active)} />
        <button
          type="submit"
          role="switch"
          aria-checked={active}
          className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
          style={{ backgroundColor: active ? "var(--primary)" : "rgb(203 213 225)" }}
        >
          <span
            className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: `translateX(${active ? 20 : 0}px)` }}
          />
        </button>
      </Form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "studios")}</h1>
        <p className="text-sm text-[color:var(--muted)]">{isZh ? "管理 Studio 与每时段容量" : "Manage studios and capacity per slot"}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "新增 Studio" : "Add studio"}</CardTitle>
          <CardDescription>{isZh ? "蓝色按钮=新增/保存" : "Blue buttons for add/save"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_140px]">
            <input type="hidden" name="intent" value="createStudio" />
            <Input name="name" placeholder={isZh ? "Studio 名称" : "Studio name"} />
            <Input name="capacityPerSlot" defaultValue="2" placeholder={isZh ? "容量" : "Capacity"} />
            <Button type="submit">{isZh ? "添加" : "Add"}</Button>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "Studio 列表" : "Studios"}</CardTitle>
          <CardDescription>{isZh ? "Edit 后才能修改；Active 可直接切换" : "Edit to change fields; toggle active anytime"}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{isZh ? "Studio" : "Studio"}</th>
                <th className="px-4 py-3">{isZh ? "Capacity/slot" : "Capacity/slot"}</th>
                <th className="px-4 py-3">{isZh ? "Active" : "Active"}</th>
                <th className="px-4 py-3 text-right">{isZh ? "Actions" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {studios.map((s) => (
                <tr key={s.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <Input
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.currentTarget.value }))}
                        className="h-9"
                      />
                    ) : (
                      <div className="font-medium">{s.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <Input
                        value={draft.capacityPerSlot}
                        onChange={(e) => setDraft((d) => ({ ...d, capacityPerSlot: e.currentTarget.value }))}
                        className="h-9 w-28"
                      />
                    ) : (
                      <span className="text-[color:var(--muted)]">{s.capacityPerSlot}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle id={s.id} active={s.active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {editingId === s.id ? (
                        <>
                          <Form method="post" className="inline-flex">
                            <input type="hidden" name="intent" value="updateStudio" />
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="name" value={draft.name} />
                            <input type="hidden" name="capacityPerSlot" value={draft.capacityPerSlot} />
                            <Button size="sm" type="submit">
                              {isZh ? "保存" : "Save"}
                            </Button>
                          </Form>
                          <Button size="sm" type="button" variant="outline" onClick={cancelEdit}>
                            {isZh ? "取消" : "Cancel"}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" type="button" variant="outline" onClick={() => startEdit(s)}>
                          {isZh ? "编辑" : "Edit"}
                        </Button>
                      )}
                      <Form method="post" className="inline-flex">
                        <input type="hidden" name="intent" value="deleteStudio" />
                        <input type="hidden" name="id" value={s.id} />
                        <Button size="sm" type="submit" variant="destructive">
                          {isZh ? "删除" : "Delete"}
                        </Button>
                      </Form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

