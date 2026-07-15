"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Calendar } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/design/motion";
import {
  TIPO_EVENTO_COR,
  TIPO_EVENTO_LABEL,
  type TipoEvento,
} from "@/lib/validators/evento";

export interface LembreteChip {
  eventoId: string;
  titulo: string;
  local: string | null;
  tipo: TipoEvento;
  inicioIso: string;
  antecedenciaLabel: string; // "em 1 h", "em 2 dias"
}

interface Props {
  lembretes: LembreteChip[];
  className?: string;
}

export function NotificationsBell({ lembretes, className }: Props) {
  const [open, setOpen] = useState(false);
  const count = lembretes.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            count > 0 ? `${count} lembrete(s) ativo(s)` : "Sem lembretes ativos"
          }
          className={cn(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-full",
            "border bg-[var(--surface)] text-[var(--text)]",
            "transition-colors hover:bg-[var(--elevated)]",
            "focus-visible:outline-none",
            className,
          )}
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={spring.snappy}
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white"
              >
                {count > 9 ? "9+" : count}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Lembretes</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {count > 0
              ? `${count} evento${count === 1 ? "" : "s"} próximo${count === 1 ? "" : "s"}`
              : "Sem eventos com lembrete ativo agora."}
          </p>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {lembretes.length === 0 ? (
            <div className="p-6 text-center">
              <Calendar
                className="mx-auto h-6 w-6 text-[var(--text-subtle)]"
                strokeWidth={1.25}
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Nada no radar. Boa.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {lembretes.map((l) => (
                <li key={l.eventoId}>
                  <Link
                    href="/eventos"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface)]"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: TIPO_EVENTO_COR[l.tipo] }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {l.titulo}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <span>{TIPO_EVENTO_LABEL[l.tipo]}</span>
                        <span>·</span>
                        <span className="font-medium text-[var(--text)]">
                          {l.antecedenciaLabel}
                        </span>
                        {l.local && (
                          <>
                            <span>·</span>
                            <span className="truncate">{l.local}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-4 py-2 text-center">
          <Link
            href="/eventos"
            onClick={() => setOpen(false)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Ver toda a agenda →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
