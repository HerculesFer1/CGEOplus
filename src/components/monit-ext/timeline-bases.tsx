"use client";

import { motion } from "framer-motion";
import { Sprout, Satellite, Flame, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { addMonths, addYears, differenceInDays, isBefore } from "date-fns";

import { cn } from "@/lib/utils";
import { CRONOGRAMA, TEMA_COR } from "@/lib/monit-ext/constants";
import type { FonteExt } from "@/lib/monit-ext/queries";
import { fadeSlideUp } from "@/lib/design/motion";

interface ExecucaoResumo {
  fonte: FonteExt;
  executadoEm: Date | null;
  status: string | null;
}

interface Props {
  execucoes: ExecucaoResumo[];
  now?: Date;
}

/**
 * Barra fina exibida no topo de todas as rotas de Monitoramento Externo.
 * Mostra, por fonte: quando a base foi atualizada e quando é a próxima janela.
 * Contextualiza qualquer decisão que o usuário for tomar dentro do dashboard.
 */
export function TimelineBases({ execucoes, now = new Date() }: Props) {
  const byFonte = new Map(execucoes.map((e) => [e.fonte, e]));

  const chips: Array<{
    fonte: FonteExt;
    label: string;
    ultimo: string;
    proximo: string;
    tom: "ok" | "aviso" | "atrasado" | "sem-dado";
    Icon: typeof Sprout;
  }> = [
    { fonte: "mapbiomas", label: CRONOGRAMA.mapbiomas.label, Icon: Sprout, ultimo: "", proximo: "", tom: "sem-dado" },
    { fonte: "prodes", label: CRONOGRAMA.prodes.label, Icon: Satellite, ultimo: "", proximo: "", tom: "sem-dado" },
    { fonte: "queimadas", label: CRONOGRAMA.queimadas.label, Icon: Flame, ultimo: "", proximo: "", tom: "sem-dado" },
  ];

  for (const c of chips) {
    const exec = byFonte.get(c.fonte);
    const proximo = calcularProxima(c.fonte, now);
    c.proximo = formatDiasEmRelacao(proximo, now, "em");

    if (!exec?.executadoEm) {
      c.ultimo = "sem sync ainda";
      c.tom = "sem-dado";
      continue;
    }
    const diasDesde = differenceInDays(now, exec.executadoEm);
    c.ultimo = formatDiasEmRelacao(exec.executadoEm, now, "há");

    const janelaAlvo = janelaMaxima(c.fonte);
    c.tom = diasDesde > janelaAlvo * 1.3
      ? "atrasado"
      : diasDesde > janelaAlvo
        ? "aviso"
        : "ok";
  }

  return (
    <motion.div
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      className="mb-6 rounded-2xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]"
    >
      <div className="mb-2 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
        <Clock className="h-3 w-3" strokeWidth={2} />
        Timeline das bases federais
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {chips.map((c) => (
          <div
            key={c.fonte}
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${TEMA_COR[c.fonte]}20`, color: TEMA_COR[c.fonte] }}
            >
              <c.Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]">
                {c.label}
                <StatusDot tom={c.tom} />
              </div>
              <p className="mt-0.5 text-[11px] leading-tight text-[var(--text-muted)]">
                Atualizado {c.ultimo}
              </p>
              <p className="text-[11px] leading-tight text-[var(--text-subtle)]">
                Próxima janela {c.proximo}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StatusDot({ tom }: { tom: "ok" | "aviso" | "atrasado" | "sem-dado" }) {
  if (tom === "ok") return <CheckCircle2 className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />;
  if (tom === "aviso") return <AlertTriangle className="h-3 w-3 text-amber-500" strokeWidth={2.5} />;
  if (tom === "atrasado") return <AlertTriangle className="h-3 w-3 text-red-500" strokeWidth={2.5} />;
  return <span className={cn("h-2 w-2 rounded-full bg-[var(--text-subtle)]")} aria-hidden />;
}

/** Próxima janela oficial da fonte upstream (não do cron CGEO+). */
function calcularProxima(fonte: FonteExt, now: Date): Date {
  if (fonte === "mapbiomas") {
    const target = new Date(now.getFullYear(), now.getMonth(), CRONOGRAMA.mapbiomas.diaLiberacaoUpstream);
    return isBefore(target, now) ? addMonths(target, 1) : target;
  }
  if (fonte === "queimadas") {
    const target = new Date(now.getFullYear(), now.getMonth(), CRONOGRAMA.queimadas.diaLiberacaoUpstream);
    return isBefore(target, now) ? addMonths(target, 1) : target;
  }
  const target = new Date(now.getFullYear(), CRONOGRAMA.prodes.mesLiberacaoUpstream - 1, CRONOGRAMA.prodes.diaLiberacaoUpstream);
  return isBefore(target, now) ? addYears(target, 1) : target;
}

function janelaMaxima(fonte: FonteExt): number {
  if (fonte === "prodes") return 400;
  return 40;
}

function formatDiasEmRelacao(date: Date, now: Date, prefixo: "em" | "há"): string {
  const diff = differenceInDays(date, now);
  const abs = Math.abs(diff);
  if (abs === 0) return prefixo === "em" ? "hoje" : "agora";
  if (abs < 30) return `${prefixo} ${abs}d`;
  if (abs < 365) {
    const meses = Math.round(abs / 30);
    return `${prefixo} ${meses}${meses === 1 ? " mês" : " meses"}`;
  }
  const anos = Math.round(abs / 365);
  return `${prefixo} ${anos}${anos === 1 ? " ano" : " anos"}`;
}

