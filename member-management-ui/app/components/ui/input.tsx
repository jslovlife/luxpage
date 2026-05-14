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
        "h-11 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 text-sm",
        "placeholder:text-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]",
        className
      )}
    />
  );
}

