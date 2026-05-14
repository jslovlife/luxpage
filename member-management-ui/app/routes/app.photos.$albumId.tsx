import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useParams } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { requireUser } from "~/lib/session.server";

/**
 * Album detail page (member).
 * - Preview / download (demo)
 * - Select up to N photos for retouch and submit request
 */
export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) throw redirect("/app/photos");

  const albumId = args.params.albumId;
  if (!albumId) throw redirect("/app/photos");

  const store = await demo.getStore();
  const album = store.albums[albumId];
  if (!album || album.memberId !== member.id) throw redirect("/app/photos");

  const photos = await demo.listPhotos({ albumId });
  return json({ member, album, photos });
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args.request);
  const demo = getDemoStoreService();
  const member = await demo.getMemberForUser(user);
  if (!member) return json({ ok: false, message: "Member not found" }, { status: 400 });

  const albumId = args.params.albumId;
  if (!albumId) return json({ ok: false, message: "Missing albumId" }, { status: 400 });

  const form = await args.request.formData();
  const selected = form.getAll("photoId").map((v) => v.toString());

  const result = await demo.submitRetouchSelection({ memberId: member.id, albumId, selectedPhotoIds: selected });
  if (!result.ok) return json({ ok: false, message: result.reason }, { status: 400 });

  return redirect(`/app/photos/${albumId}`);
}

export default function AlbumDetailPage() {
  const { album, photos } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const params = useParams();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{album.title}</h1>
          <p className="text-sm text-[color:var(--muted)]">{album.shootDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{album.status}</Badge>
          <Button asChild variant="outline">
            <Link to="/app/photos">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retouch selection</CardTitle>
          <CardDescription>
            Select up to {album.retouchLimit} photos · current {album.retouchSelectedPhotoIds.length}/{album.retouchLimit}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {actionData && "message" in actionData ? (
            <div className="text-xs text-red-600">{(actionData as any).message}</div>
          ) : null}

          <Form method="post" className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {photos.map((p) => {
                const checked = album.retouchSelectedPhotoIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white p-2"
                  >
                    <img
                      src={p.url}
                      alt={p.id}
                      className="aspect-[4/3] w-full rounded-xl bg-[color:var(--bg)] object-cover"
                      loading="lazy"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[color:var(--muted)]">{p.id}</div>
                      <div className="flex items-center gap-2">
                        <a
                          href={p.url}
                          download={p.filename ?? p.id}
                          className="text-xs text-[color:var(--primary)] underline-offset-2 hover:underline"
                        >
                          Download
                        </a>
                        <input type="checkbox" name="photoId" value={p.id} defaultChecked={checked} />
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-[color:var(--muted)]">AlbumId: {params.albumId}</div>
              <Button type="submit">Submit retouch request（Demo）</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
