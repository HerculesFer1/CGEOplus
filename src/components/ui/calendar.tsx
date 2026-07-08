"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import {
  DayPicker,
  useDayPicker,
  type DayPickerProps,
  type MonthCaptionProps,
} from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const CaptionTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    label: React.ReactNode;
    active: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function CaptionTrigger({ label, active, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium capitalize transition-colors",
        "hover:bg-[var(--surface)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        active && "bg-[var(--surface)]",
        className,
      )}
    >
      {label}
      <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={1.75} />
    </button>
  );
});

function MonthGrid({
  selectedMonth,
  onSelect,
}: {
  selectedMonth: number;
  onSelect: (m: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {MONTH_LABELS.map((m, i) => (
        <button
          key={m}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "rounded-md px-2 py-1.5 text-sm transition-colors",
            i === selectedMonth
              ? "bg-[var(--accent)] font-medium text-white"
              : "hover:bg-[var(--surface)]",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function YearGrid({
  selectedYear,
  onSelect,
}: {
  selectedYear: number;
  onSelect: (y: number) => void;
}) {
  const [decadeStart, setDecadeStart] = React.useState(
    Math.floor(selectedYear / 10) * 10,
  );

  React.useEffect(() => {
    setDecadeStart(Math.floor(selectedYear / 10) * 10);
  }, [selectedYear]);

  const years = Array.from({ length: 10 }, (_, i) => decadeStart + i);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDecadeStart((d) => d - 10)}
          aria-label="Década anterior"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <span className="text-sm font-medium">
          {decadeStart} – {decadeStart + 9}
        </span>
        <button
          type="button"
          onClick={() => setDecadeStart((d) => d + 10)}
          aria-label="Próxima década"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => onSelect(y)}
            className={cn(
              "rounded-md px-1 py-1.5 text-sm transition-colors",
              y === selectedYear
                ? "bg-[var(--accent)] font-medium text-white"
                : "hover:bg-[var(--surface)]",
            )}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}

function MonthYearCaption({ calendarMonth }: MonthCaptionProps) {
  const { goToMonth } = useDayPicker();
  const [openMonth, setOpenMonth] = React.useState(false);
  const [openYear, setOpenYear] = React.useState(false);
  const date = calendarMonth.date;
  const monthIdx = date.getMonth();
  const year = date.getFullYear();

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={openMonth} onOpenChange={setOpenMonth}>
        <PopoverTrigger asChild>
          <CaptionTrigger
            label={format(date, "LLLL", { locale: ptBR })}
            active={openMonth}
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2">
          <MonthGrid
            selectedMonth={monthIdx}
            onSelect={(m) => {
              goToMonth(new Date(year, m));
              setOpenMonth(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Popover open={openYear} onOpenChange={setOpenYear}>
        <PopoverTrigger asChild>
          <CaptionTrigger label={year} active={openYear} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-2">
          <YearGrid
            selectedYear={year}
            onSelect={(y) => {
              goToMonth(new Date(y, monthIdx));
              setOpenYear(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Calendário custom no design do CGEO+.
 * Baseado em react-day-picker v10 com pickers custom para mês/ano.
 */
export function Calendar({
  className,
  classNames,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays
      className={cn("cgeo-calendar p-1 text-sm text-[var(--text)]", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "space-y-2",
        month_caption:
          "flex items-center px-2 pt-1 pb-2 text-sm font-medium capitalize",
        nav: "flex items-center gap-1 absolute right-2 top-1",
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          "text-[var(--text-muted)] transition-colors",
          "hover:bg-[var(--surface)] hover:text-[var(--text)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          "text-[var(--text-muted)] transition-colors",
          "hover:bg-[var(--surface)] hover:text-[var(--text)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        ),
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]",
        week: "flex w-full mt-1",
        day: "h-9 w-9 p-0 text-center text-sm relative",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          "text-[var(--text)] transition-colors",
          "hover:bg-[var(--surface)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        ),
        selected:
          "[&_button]:bg-[var(--accent)] [&_button]:text-white [&_button]:hover:bg-[var(--accent)] [&_button]:font-medium",
        today:
          "[&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-[var(--accent)]/50",
        outside: "text-[var(--text-muted)]/40",
        disabled: "opacity-40 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        MonthCaption: MonthYearCaption,
        Chevron: ({ orientation }) =>
          orientation === "up" ? (
            <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
          ) : orientation === "down" ? (
            <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
          ) : orientation === "left" ? (
            <ChevronUp className="h-4 w-4 -rotate-90" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="h-4 w-4 -rotate-90" strokeWidth={1.75} />
          ),
      }}
      {...props}
    />
  );
}
