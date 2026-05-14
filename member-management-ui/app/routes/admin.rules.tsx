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
  const rules = await demo.listRuleConfigs();
  return json({ lang, rules });
}

/**
 * Rules module actions:
 * - createRule
 * - updateRule
 * - deleteRule
 */
export async function action(args: ActionFunctionArgs) {
  const demo = getDemoStoreService();
  const form = await args.request.formData();
  const intent = form.get("intent")?.toString() ?? "updateRule";

  if (intent === "createRule") {
    const name = form.get("name")?.toString() ?? "";
    const description = form.get("description")?.toString() ?? "";
    const value = form.get("value")?.toString() ?? "";
    await demo.createRuleConfig({ name, description, value });
    return redirect("/admin/rules");
  }

  if (intent === "deleteRule") {
    const id = form.get("id")?.toString() ?? "";
    await demo.deleteRuleConfig({ id });
    return redirect("/admin/rules");
  }

  // updateRule
  const id = form.get("id")?.toString() ?? "";
  const name = form.get("name")?.toString();
  const description = form.get("description")?.toString();
  const value = form.get("value")?.toString();
  await demo.updateRuleConfig({ id, name, description, value });
  return redirect("/admin/rules");
}

export default function AdminRulesPage() {
  const { lang, rules } = useLoaderData<typeof loader>();
  const isZh = lang === "zh";

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; description: string; value: string }>({
    name: "",
    description: "",
    value: ""
  });

  function startEdit(rule: (typeof rules)[number]) {
    setEditingId(rule.id);
    setDraft({ name: rule.name, description: rule.description, value: rule.value });
  }
  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "rules")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {isZh ? "以 DataTable 管理规则（可扩展新增规则）" : "Rule DataTable (extensible)"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "规则列表" : "Rules"}</CardTitle>
          <CardDescription>
            {isZh ? "结构：Rule Name / Rule Description / Rule Value" : "Columns: Name / Description / Value"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Form
            method="post"
            className="grid grid-cols-1 gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 md:grid-cols-[220px_1fr_160px_120px]"
          >
            <input type="hidden" name="intent" value="createRule" />
            <Input name="name" placeholder={isZh ? "规则名称" : "Rule name"} />
            <Input name="description" placeholder={isZh ? "规则说明" : "Description"} />
            <Input name="value" placeholder={isZh ? "数值" : "Value"} />
            <Button type="submit">{isZh ? "添加" : "Add"}</Button>
          </Form>

          <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{isZh ? "Rule Name" : "Rule Name"}</th>
                  <th className="px-4 py-3">{isZh ? "Rule Description" : "Rule Description"}</th>
                  <th className="px-4 py-3">{isZh ? "Rule Value" : "Rule Value"}</th>
                  <th className="px-4 py-3 text-right">{isZh ? "Actions" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-[color:var(--border)]">
                    <td className="px-4 py-3">
                      {editingId === r.id ? (
                        <Input
                          value={draft.name}
                          onChange={(e) => setDraft((d) => ({ ...d, name: e.currentTarget.value }))}
                          className="h-9"
                        />
                      ) : (
                        <div className="font-medium">{r.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === r.id ? (
                        <Input
                          value={draft.description}
                          onChange={(e) => setDraft((d) => ({ ...d, description: e.currentTarget.value }))}
                          className="h-9"
                        />
                      ) : (
                        <div className="text-[color:var(--muted)]">{r.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === r.id ? (
                        <Input
                          value={draft.value}
                          onChange={(e) => setDraft((d) => ({ ...d, value: e.currentTarget.value }))}
                          className="h-9 w-40"
                        />
                      ) : (
                        <div className="font-medium">{r.value}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {editingId === r.id ? (
                          <>
                            <Form method="post" className="inline-flex">
                              <input type="hidden" name="intent" value="updateRule" />
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="name" value={draft.name} />
                              <input type="hidden" name="description" value={draft.description} />
                              <input type="hidden" name="value" value={draft.value} />
                              <Button size="sm" type="submit">
                                {isZh ? "保存" : "Save"}
                              </Button>
                            </Form>
                            <Button size="sm" type="button" variant="outline" onClick={cancelEdit}>
                              {isZh ? "取消" : "Cancel"}
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" type="button" variant="outline" onClick={() => startEdit(r)}>
                            {isZh ? "编辑" : "Edit"}
                          </Button>
                        )}

                        <Form method="post" className="inline-flex">
                          <input type="hidden" name="intent" value="deleteRule" />
                          <input type="hidden" name="id" value={r.id} />
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
