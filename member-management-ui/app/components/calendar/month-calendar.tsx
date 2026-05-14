import * as React from "react";
import { cn } from "~/lib/utils";

/**
 * MonthCalendar（轻量 PoC 日历）
 *
 * 目标：
 * - 预约选择日期用“月历”展示，更符合用户预期
 * - 不引入第三方依赖（便于 PoC 与维护）
 *
 * 注意：这是 PoC 版本，后续若要更强的无障碍/键盘/国际化，
 * 可以切到成熟日历库或 Radix + date-fns 方案。
 */
export function MonthCalendar(props: {
  /**
   * Month in "YYYY-MM"
   */
  month: string;
  /**
   * ISO date string "YYYY-MM-DD"
   */
  selected?: string;
  /**
   * Disable before (inclusive). Format "YYYY-MM-DD"
   */
  minDate?: string;
  /**
   * Disable after (inclusive). Format "YYYY-MM-DD"
   */
  maxDate?: string;
  onChangeMonth: (nextMonth: string) => void;
  onSelect: (date: string) => void;
}) {
  const { month, selected, minDate, maxDate, onChangeMonth, onSelect } = props;

  const first = React.useMemo(() => new Date(`${month}-01T00:00:00`), [month]);
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const min = minDate ? new Date(`${minDate}T00:00:00`).getTime() : null;
  const max = maxDate ? new Date(`${maxDate}T23:59:59`).getTime() : null;

  const padStart = firstDayOfWeek; // Sunday-first calendar
  const cells = Array.from({ length: padStart + daysInMonth }).map((_, idx) => {
    if (idx < padStart) return null;
    const day = idx - padStart + 1;
    const d = new Date(year, monthIndex, day);
    const iso = d.toISOString().slice(0, 10);
    const ts = d.getTime();
    const disabled = (min !== null && ts < min) || (max !== null && ts > max);
    return { day, iso, disabled };
  });

  function prevMonth() {
    const d = new Date(year, monthIndex - 1, 1);
    onChangeMonth(d.toISOString().slice(0, 7));
  }
  function nextMonth() {
    const d = new Date(year, monthIndex + 1, 1);
    onChangeMonth(d.toISOString().slice(0, 7));
  }

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-white p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-xl px-2 py-1 text-sm text-[color:var(--muted)] hover:bg-[color:var(--bg)]"
        >
          ←
        </button>
        <div className="text-sm font-medium">
          {year}-{String(monthIndex + 1).padStart(2, "0")}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-xl px-2 py-1 text-sm text-[color:var(--muted)] hover:bg-[color:var(--bg)]"
        >
          →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {weekdays.map((w, i) => (
          <div key={i} className="px-1 pb-1 text-center text-[11px] text-[color:var(--muted)]">
            {w}
          </div>
        ))}
        {cells.map((c, idx) => {
          if (!c) return <div key={idx} />;
          const active = c.iso === selected;
          return (
            <button
              key={c.iso}
              type="button"
              disabled={c.disabled}
              onClick={() => onSelect(c.iso)}
              className={cn(
                "h-10 rounded-xl text-sm transition-colors",
                c.disabled ? "cursor-not-allowed text-[color:var(--border)]" : "hover:bg-[color:var(--bg)]",
                active ? "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary)]" : "bg-transparent"
              )}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

