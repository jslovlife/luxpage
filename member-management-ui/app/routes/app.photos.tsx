import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { requireUser } from "~/lib/session.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  const albums = member ? await demo.listAlbums({ memberId: member.id }) : [];
  return json({ lang, member, albums });
}

export default function PhotosPage() {
  const { lang, member, albums } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "photos")}</h1>
        <p className="text-sm text-[color:var(--muted)]">Albums → Preview → Download / Retouch selection (demo flow)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Albums</CardTitle>
          <CardDescription>After your shoot, photos will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          {albums.length ? (
            <div className="flex flex-col gap-2">
              {albums.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
                >
                  <div className="flex flex-col">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {a.shootDate} · retouch {a.retouchSelectedPhotoIds.length}/{a.retouchLimit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{a.status}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/app/photos/${a.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 text-sm text-[color:var(--muted)]">
              Empty. After admin delivers an album, it will appear here. (member: {member?.memberNo ?? "-"})
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
