import * as React from "react";
import { cn } from "~/lib/utils";

export type SelectMenuOption = { value: string; label: string };

/**
 * SelectMenu（PoC 用的轻量自定义下拉）
 *
 * 目标：
 * - 避免部分浏览器/系统的原生 <select> 下拉“跑位/箭头错位”问题
 * - 视觉风格与现有 shadcn-like Input 一致
 * - 支持表单提交：通过 hidden input 写入 name/value
 *
 * 注意：这是 PoC 级别的实现，后续如要更完整的可访问性/键盘交互，
 * 建议切换到 Radix Select（shadcn/ui 官方方案）。
 */
export function SelectMenu(props: {
  name: string;
  value: string;
  onValueChange: (next: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { name, value, onValueChange, options, placeholder, disabled, className } = props;
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const current = options.find((o) => o.value === value);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-11 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 pr-10 text-left text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
      >
        <span className={cn(current ? "text-[color:var(--text)]" : "text-[color:var(--muted)]")}>
          {current ? current.label : placeholder ?? "Select..."}
        </span>
      </button>

      <svg
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]",
          open ? "rotate-180" : ""
        )}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>

      {open ? (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white shadow-lg"
          )}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                  "hover:bg-[color:var(--bg)]",
                  active ? "bg-[color:var(--bg)] font-medium" : "text-[color:var(--text)]"
                )}
              >
                <span>{o.label}</span>
                {active ? <span className="text-[color:var(--primary)]">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

