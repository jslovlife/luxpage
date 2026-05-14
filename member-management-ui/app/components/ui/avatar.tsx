import * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Minimal Avatar component.
 */
export function Avatar(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "relative inline-flex size-10 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)] bg-white",
        props.className
      )}
    />
  );
}

export function AvatarImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} className={cn("h-full w-full object-cover", props.className)} />;
}

export function AvatarFallback(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "flex h-full w-full items-center justify-center bg-[color:var(--bg)] text-xs font-medium text-[color:var(--muted)]",
        props.className
      )}
    />
  );
}

