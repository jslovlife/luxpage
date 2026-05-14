import * as React from "react";
import type { Lang } from "~/lib/i18n";
import { cn } from "~/lib/utils";

/**
 * LanguageToggle
 * - Small segmented control for switching between zh/en
 * - Uses /lang/:lang routes (cookie-based)
 */
export function LanguageToggle(props: { lang: Lang; className?: string }) {
  const { lang, className } = props;
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg)] p-1 text-xs",
        className
      )}
      role="group"
      aria-label="Language"
    >
      <a
        href="/lang/zh"
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          lang === "zh" ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm" : "text-[color:var(--muted)]"
        )}
      >
        中文
      </a>
      <a
        href="/lang/en"
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          lang === "en" ? "bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm" : "text-[color:var(--muted)]"
        )}
      >
        EN
      </a>
    </div>
  );
}

