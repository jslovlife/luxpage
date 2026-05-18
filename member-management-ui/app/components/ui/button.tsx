import * as React from "react";
import { cn } from "~/lib/utils";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "default" | "sm" | "lg";

/**
 * Minimal shadcn-like Button (no external deps).
 * @example
 * <Button>Save</Button>
 * <Button variant="outline">Cancel</Button>
 */
export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    asChild?: boolean;
  }
) {
  const { className, variant = "default", size = "default", asChild, ...rest } = props;

  const classes = cn(
    "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    size === "default" && "h-11 px-4",
    size === "sm" && "h-9 px-3",
    size === "lg" && "h-12 px-5 text-base",
    variant === "default" && "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:opacity-90",
    variant === "secondary" && "bg-white text-[color:var(--text)] border border-[color:var(--border)] hover:bg-[color:var(--bg)]",
    variant === "outline" && "bg-transparent text-[color:var(--text)] border border-[color:var(--border)] hover:bg-white",
    variant === "ghost" && "bg-transparent text-[color:var(--text)] hover:bg-white",
    variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
    className
  );

  if (asChild) {
    // Minimal "asChild": expect a single ReactElement child that supports className.
    const child = React.Children.only(rest.children) as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, { className: cn(classes, child.props.className) });
  }

  return <button className={classes} {...rest} />;
}
