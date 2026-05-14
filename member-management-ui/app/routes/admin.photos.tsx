import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  json,
  redirect,
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData
} from "@remix-run/node";
import fs from "node:fs/promises";
import path from "node:path";
import { Form, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getDemoStoreService } from "~/lib/demo-store.server";
import { getLang } from "~/lib/lang.server";
import { t } from "~/lib/i18n";

export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const demo = getDemoStoreService();
  const store = await demo.getStore();
  const bookings = await demo.listBookings();
  const albums = await demo.listAlbums();
  return json({
    lang,
    bookings,
    albums,
    membersById: store.members,
    studiosById: store.studios ?? {}
  });
}

/**
 * Admin actions:
 * - deliver album from booking (generates placeholder photos)
 * - mark retouch done
 * - upload photos to an album (stores in /public/demo-uploads)
 */
export async function action(args: ActionFunctionArgs) {
  const demo = getDemoStoreService();
  const contentType = args.request.headers.get("Content-Type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");
  if (isMultipart) {
    // Multipart upload for photos
    const url = new URL(args.request.url);
    const albumId = url.searchParams.get("albumId") ?? "";
    if (!albumId) return json({ ok: false, message: "Missing albumId" }, { status: 400 });

    const folder = path.join(process.cwd(), "public", "demo-uploads", albumId);
    await fs.mkdir(folder, { recursive: true });

    const uploadHandler = unstable_createFileUploadHandler({
      directory: folder,
      maxPartSize: 10_000_000,
      file: ({ filename }) => {
        const safe = (filename ?? "upload")
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, "_")
          .slice(0, 80);
        return `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`;
      }
    });

    const multipart = await unstable_parseMultipartFormData(args.request, uploadHandler);
    const files = multipart.getAll("photos");

    for (const f of files) {
      // NodeOnDiskFile implements File-like shape; `name` is the stored filename.
      const file = f as unknown as { name?: string };
      if (!file?.name) continue;
      const publicUrl = `/demo-uploads/${albumId}/${file.name}`;
      await demo.addPhotoToAlbum({ albumId, url: publicUrl, filename: file.name, source: "local" });
    }

    return redirect("/admin/photos");
  }

  const form = await args.request.formData();
  const intent = (form.get("intent")?.toString() ?? "") as string;

  if (intent === "deliverAlbum") {
    const bookingId = form.get("bookingId")?.toString();
    if (!bookingId) return json({ ok: false, message: "Missing bookingId" }, { status: 400 });
    await demo.deliverAlbumFromBooking({ bookingId, retouchLimit: 5 });
    return redirect("/admin/photos");
  }

  if (intent === "retouchDone") {
    const albumId = form.get("albumId")?.toString();
    if (!albumId) return json({ ok: false, message: "Missing albumId" }, { status: 400 });
    await demo.markRetouchDone({ albumId });
    return redirect("/admin/photos");
  }

  return json({ ok: false, message: "Unknown intent" }, { status: 400 });
}

export default function AdminPhotosPage() {
  const { lang, bookings, albums, membersById, studiosById } = useLoaderData<typeof loader>();
  const isZh = lang === "zh";

  const deliveredBookingIds = new Set(albums.map((a) => a.bookingId).filter(Boolean) as string[]);
  const studioName = (idOrName: string) => studiosById[idOrName]?.name ?? idOrName;
  const formatTimeRange = (startsAt: string, endsAt: string) => {
    const day = startsAt.slice(0, 10);
    const start = startsAt.slice(11, 16);
    const end = endsAt.slice(11, 16);
    return `${day} ${start}–${end}`;
  };
  const bookingStatusLabel = (delivered: boolean) => {
    if (isZh) return delivered ? "已交付相册" : "未交付";
    return delivered ? "Delivered" : "Pending";
  };
  const albumStatusLabel = (s: string) => {
    if (!isZh) return s;
    if (s === "waiting_upload") return "等待上传";
    if (s === "delivered") return "已交付";
    if (s === "retouch_requested") return "等待精修";
    if (s === "retouch_done") return "已完成";
    return s;
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t(lang, "photos")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {isZh ? "交付相册 / 上传照片 / 精修状态" : "Deliver albums / upload photos / retouch status"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "预约列表（生成相册）" : "Bookings → Deliver album"}</CardTitle>
          <CardDescription>
            {isZh ? "选择预约并生成相册（PoC 会自动生成占位图）" : "Pick a booking and generate an album with placeholder photos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{isZh ? "预约时间" : "Time"}</th>
                <th className="px-4 py-3">{isZh ? "会员" : "Member"}</th>
                <th className="px-4 py-3">{isZh ? "摄影棚" : "Studio"}</th>
                <th className="px-4 py-3">{isZh ? "摄影师" : "Photographer"}</th>
                <th className="px-4 py-3">{isZh ? "状态" : "Status"}</th>
                <th className="px-4 py-3 text-right">{isZh ? "操作" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length ? (
                bookings.map((b) => {
                  const member = membersById[b.memberId];
                  const delivered = deliveredBookingIds.has(b.id);
                  return (
                    <tr key={b.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3 text-[color:var(--muted)]">{formatTimeRange(b.startsAt, b.endsAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{member?.name ?? "Unknown"}</span>
                          <span className="text-xs text-[color:var(--muted)]">
                            {member?.phone ?? "-"} · {member?.memberNo ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{studioName(b.studio)}</td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">{b.photographer}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            delivered
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }
                        >
                          {bookingStatusLabel(delivered)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Form method="post" className="inline-flex">
                          <input type="hidden" name="intent" value="deliverAlbum" />
                          <input type="hidden" name="bookingId" value={b.id} />
                          <Button type="submit" size="sm" disabled={delivered}>
                            {isZh ? "生成相册" : "Deliver"}
                          </Button>
                        </Form>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--muted)]">
                    {isZh ? "暂无数据" : "Empty"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "相册列表" : "Albums"}</CardTitle>
          <CardDescription>
            {isZh
              ? "使用方式：1) 先在上方“生成相册” 2) 在此处上传照片 3) 会员端选择精修 4) 回来点“标记精修完成”"
              : "Flow: deliver album → upload photos → member selects retouch → mark retouch done"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3">{isZh ? "相册" : "Album"}</th>
                <th className="px-4 py-3">{isZh ? "会员" : "Member"}</th>
                <th className="px-4 py-3">{isZh ? "状态" : "Status"}</th>
                <th className="px-4 py-3">{isZh ? "精修" : "Retouch"}</th>
                <th className="px-4 py-3">{isZh ? "上传照片" : "Upload"}</th>
                <th className="px-4 py-3 text-right">{isZh ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {albums.length ? (
                albums.map((a) => {
                  const member = membersById[a.memberId];
                  const retouch = `${a.retouchSelectedPhotoIds.length}/${a.retouchLimit}`;
                  const retouchReady = a.status === "retouch_requested";
                  const statusClass =
                    a.status === "retouch_done"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : a.status === "retouch_requested"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-slate-50 text-slate-700";
                  return (
                    <tr key={a.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{a.title}</span>
                          <span className="text-xs text-[color:var(--muted)]">{a.shootDate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{member?.name ?? "Unknown"}</span>
                          <span className="text-xs text-[color:var(--muted)]">
                            {member?.phone ?? "-"} · {member?.memberNo ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusClass}>
                          {albumStatusLabel(a.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">{retouch}</td>
                      <td className="px-4 py-3">
                        <Form method="post" encType="multipart/form-data" action={`/admin/photos?albumId=${a.id}`}>
                          <div className="flex items-center gap-2">
                            <input id={`upload_${a.id}`} className="hidden" type="file" name="photos" accept="image/*" multiple />
                            <Button asChild size="sm" variant="outline">
                              <label htmlFor={`upload_${a.id}`}>{isZh ? "选择文件" : "Choose files"}</label>
                            </Button>
                            <Button size="sm" type="submit">
                              {isZh ? "上传" : "Upload"}
                            </Button>
                          </div>
                        </Form>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Form method="post" className="inline-flex">
                          <input type="hidden" name="intent" value="retouchDone" />
                          <input type="hidden" name="albumId" value={a.id} />
                          <Button type="submit" size="sm" variant="outline" disabled={!retouchReady}>
                            {isZh ? "标记精修完成" : "Mark retouch done"}
                          </Button>
                        </Form>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--muted)]">
                    {isZh ? "暂无数据" : "Empty"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
