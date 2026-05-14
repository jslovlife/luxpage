import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import stylesUrl from "./styles/tailwind.css?url";
import { getLang } from "~/lib/lang.server";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesUrl }];

/**
 * Root loader: provide language for whole app.
 */
export async function loader(args: LoaderFunctionArgs) {
  const lang = await getLang(args.request);
  const url = new URL(args.request.url);
  const theme = url.pathname.startsWith("/app") ? "member" : "admin";
  return json({ lang, theme });
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  return (
    <html lang={data.lang} data-theme={data.theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-[color:var(--bg)] text-[color:var(--text)]">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
