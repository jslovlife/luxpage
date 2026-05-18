import * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Minimal shadcn-like Input.
 */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "h-12 w-full rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm",
        "placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]",
        className
      )}
    />
  );
}
