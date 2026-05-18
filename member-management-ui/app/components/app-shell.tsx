import * as React from "react";
import { Form, Link, NavLink, useLocation } from "@remix-run/react";
import type { Lang } from "~/lib/i18n";
import { t } from "~/lib/i18n";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

type NavItem = { to: string; labelKey: Parameters<typeof t>[1] };

function Icon(props: {
  name: "home" | "calendar" | "photos" | "bell" | "user" | "message";
  className?: string;
}) {
  const { name, className } = props;
  const common = { className: cn("h-5 w-5", className), fill: "none", stroke: "currentColor", strokeWidth: 2 };
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M7 3v3M17 3v3" />
          <path d="M4 8h16" />
          <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "photos":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M4 7a2 2 0 0 1 2-2h3l1-1h4l1 1h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
          <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "message":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
          <path d="M20 21a8 8 0 1 0-16 0" />
          <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        </svg>
      );
  }
}

function mobileIconFor(labelKey: NavItem["labelKey"]): React.ComponentProps<typeof Icon>["name"] {
  switch (labelKey) {
    case "home":
      return "home";
    case "dashboard":
      return "home";
    case "bookings":
      return "calendar";
    case "photos":
      return "photos";
    case "messages":
      return "message";
    case "notifications":
      return "bell";
    case "profile":
    case "me":
      return "user";
    default:
      return "home";
  }
}

/**
 * App Shell（会员端与后台共用）。
 * - 顶部栏（移动端友好）
 * - 桌面端左侧导航
 */
export function AppShell(props: {
  lang: Lang;
  brandHref: string;
  brandLabel: string;
  nav: NavItem[];
  /**
   * Optional mobile bottom tabs (recommended for member app).
   */
  mobileNav?: NavItem[];
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  hideHeader?: boolean;
  /**
   * UI variant.
   * - member: hides path debug label, enables app-like spacing.
   * - admin: keeps current console style.
   */
  variant?: "member" | "admin";
}) {
  const { lang, brandHref, brandLabel, nav, mobileNav, children, headerRight, hideHeader = false, variant = "admin" } = props;
  const location = useLocation();
  const activeNav = React.useMemo(() => {
    // longest prefix match for nested routes
    const sorted = [...nav].sort((a, b) => b.to.length - a.to.length);
    return sorted.find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/")) ?? null;
  }, [location.pathname, nav]);

  return (
    <div data-theme={variant} className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] antialiased">
      {!hideHeader ? (
        <header
          className={cn(
            variant === "member"
              ? "z-10 bg-[color:var(--bg)]"
              : "sticky top-0 z-10 border-b border-[color:var(--border)] bg-[color:var(--surface)]/85 backdrop-blur"
          )}
        >
          <div className="w-full px-4 py-3 md:px-6 2xl:px-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link
                  to={brandHref}
                  className={cn(
                    "tracking-tight",
                    variant === "member"
                      ? "font-normal text-[22px] leading-none [font-family:var(--font-display)]"
                      : "font-semibold"
                  )}
                  style={variant === "member" ? { letterSpacing: "0.06em" } : undefined}
                >
                  {brandLabel}
                </Link>
                {variant !== "member" && activeNav ? (
                  <div className="hidden items-center gap-2 text-xs text-[color:var(--muted)] md:flex">
                    <span className="opacity-60">/</span>
                    <span className="rounded-full bg-[color:var(--bg)] px-2 py-1">{t(lang, activeNav.labelKey)}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">{headerRight}</div>
            </div>
          </div>
        </header>
      ) : null}

      <div
        className={cn(
          "w-full grid grid-cols-1 gap-4 px-4 py-6 md:px-6 2xl:px-10 md:grid-cols-[280px_1fr]",
          mobileNav ? "pb-32 md:pb-6" : ""
        )}
      >
        <aside className="hidden md:block">
          <nav className="flex flex-col gap-1 rounded-2xl border border-[color:var(--border)] bg-white p-2">
            {nav.map((item) => {
              const shouldEnd = nav.some((other) => other.to !== item.to && other.to.startsWith(item.to + "/"));
              return (
              <NavLink
                key={item.to}
                to={item.to}
                end={shouldEnd}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[color:var(--bg)]",
                    isActive ? "bg-[color:var(--bg)] font-medium" : "text-[color:var(--muted)]"
                  )
                }
              >
                {t(lang, item.labelKey)}
              </NavLink>
              );
            })}
            <Separator className="my-2" />
            <div className="px-2 pb-1 text-xs text-[color:var(--muted)]">Demo only</div>
            <Form method="post" action="/logout">
              <Button variant="outline" type="submit" className="w-full justify-start">
                {t(lang, "signOut")}
              </Button>
            </Form>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      {mobileNav ? (
        <nav
          className={cn(
            "fixed inset-x-0 bottom-0 z-20 md:hidden",
            "bg-[color:var(--bg)]/92 backdrop-blur",
            "shadow-[0_-18px_40px_rgba(0,0,0,0.08)]"
          )}
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)"
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[color:var(--bg)] to-transparent opacity-80" />
          <div className="flex items-stretch justify-between gap-1 px-3 pt-3">
            {mobileNav.map((item) => {
              const shouldEnd = mobileNav.some((other) => other.to !== item.to && other.to.startsWith(item.to + "/"));
              return (
              <NavLink
                key={item.to}
                to={item.to}
                prefetch="intent"
                end={shouldEnd}
                className="flex w-full items-center justify-center py-1"
              >
                {({ isActive }) => (
                  <div
                    className={cn(
                      "flex w-[86px] flex-col items-center justify-center gap-1 rounded-[18px] px-3 py-3 text-xs transition-colors",
                      isActive
                        ? "bg-[color:var(--primary-soft)] text-[color:var(--primary)] shadow-[0_10px_26px_rgba(0,0,0,0.10)]"
                        : "text-[color:var(--muted)]"
                    )}
                  >
                    <Icon
                      name={mobileIconFor(item.labelKey)}
                      className={cn(isActive ? "text-[color:var(--primary)]" : "text-[color:var(--muted)]")}
                    />
                    <span className={cn("text-[11px]", isActive ? "font-medium" : "")}>{t(lang, item.labelKey)}</span>
                  </div>
                )}
              </NavLink>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
