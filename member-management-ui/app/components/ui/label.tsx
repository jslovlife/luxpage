import * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Minimal Label.
 */
export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-medium", props.className)} />;
}

