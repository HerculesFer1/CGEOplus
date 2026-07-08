"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface Props {
  /** ISO date "AAAA-MM-DD" (ou vazio). */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  ariaLabel?: string;
  fromYear?: number;
  toYear?: number;
}

function parseIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Campo de data com calendário custom.
 * Substitui `<input type="date">` mantendo o mesmo contrato ISO.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  disabled,
  id,
  className,
  ariaLabel,
  fromYear = 1940,
  toYear,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseIso(value);
  const now = new Date();
  const finalToYear = toYear ?? now.getFullYear() + 5;

  const label = parsed
    ? format(parsed, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border bg-[var(--elevated)] px-3 text-sm transition-colors",
            "hover:border-[var(--accent)]/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !parsed && "text-[var(--text-muted)]",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <CalendarDays
            className="h-4 w-4 flex-none text-[var(--text-muted)]"
            strokeWidth={1.75}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => {
            if (d) {
              onChange(toIso(d));
              setOpen(false);
            }
          }}
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(finalToYear, 11)}
          defaultMonth={parsed}
        />
        <div className="mt-1 flex items-center justify-between border-t px-2 py-1.5">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(toIso(new Date()));
              setOpen(false);
            }}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
