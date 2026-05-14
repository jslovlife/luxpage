import * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Minimal Separator.
 */
export function Separator(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("h-px w-full bg-[color:var(--border)]", props.className)} />;
}

