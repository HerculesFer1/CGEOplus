"use client";

import { Calendar, Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Dropdown de ano compartilhado por Queimadas, MapBiomas e PRODES.
 * - Ícone + label + chevron; ao clicar, popover com a lista de anos.
 * - Opção "Todos os anos" (`ano=all`) fica no topo, separada por divisor.
 * - Atualiza `?ano=` sem scroll pra manter posição vertical do usuário.
 *
 * `anoAtual` = número do ano OU a string `"all"`. Vem sempre da URL, então
 * é serializável de server → client sem drama.
 */
export function AnoDropdown({
  anos,
  anoAtual,
  corTema,
}: {
  anos: number[];
  anoAtual: number | "all";
  corTema: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const escolher = (v: number | "all") => {
    setOpen(false);
    const query = v === "all" ? "?ano=all" : `?ano=${v}`;
    router.push(query, { scroll: false });
  };

  const label = anoAtual === "all" ? "Todos os anos" : String(anoAtual);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-2 rounded-full border bg-[var(--surface)] px-3.5 py-1.5 text-[12px] font-medium tabular-nums transition-colors hover:bg-[var(--elevated)]"
          style={{ color: corTema }}
          aria-label="Filtrar por ano"
        >
          <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Ano
          </span>
          <span className="text-[13px]">{label}</span>
          <ChevronDown
            className="h-3 w-3 text-[var(--text-subtle)] transition-transform data-[state=open]:rotate-180"
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="min-w-[180px] p-1">
        <button
          onClick={() => escolher("all")}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium text-[var(--text)] hover:bg-[var(--surface)]"
          style={anoAtual === "all" ? { color: corTema } : undefined}
        >
          Todos os anos
          {anoAtual === "all" && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
        </button>
        <div className="my-1 h-px bg-[var(--border)]" aria-hidden />
        {[...anos].reverse().map((a) => (
          <button
            key={a}
            onClick={() => escolher(a)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium tabular-nums text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            style={a === anoAtual ? { color: corTema } : undefined}
          >
            {a}
            {a === anoAtual && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
