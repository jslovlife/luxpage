import * as React from "react";
import { cn } from "~/lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline";

/**
 * Minimal Badge.
 */
export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
  }
) {
  const { className, variant = "default", ...rest } = props;
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variant === "default" && "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]",
        variant === "secondary" && "bg-[color:var(--bg)] text-[color:var(--text)] border border-[color:var(--border)]",
        variant === "outline" && "bg-transparent text-[color:var(--text)] border border-[color:var(--border)]",
        className
      )}
    />
  );
}

