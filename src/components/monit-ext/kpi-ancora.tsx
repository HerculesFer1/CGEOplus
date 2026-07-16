"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";

import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";

/**
 * Cabeçalho de decisão do aparato geral. 4 blocos horizontais:
 *   1. KPI-âncora (métrica principal do tema — IPI, %concordância, %em prioritárias)
 *   2. Delta vs período anterior (setinha + variação)
 *   3. Município crítico do momento com CTA
 *   4. Próxima atualização prevista da base
 *
 * A cor tema pinta o valor principal e os detalhes de estado. Aparece em
 * todas as landings do módulo Externo com o mesmo shape.
 */

export interface KpiAncoraProps {
  kpiLabel: string;
  kpiValor: string;
  kpiSufixo?: string;
  kpiCorTema: string;
  kpiDescricao?: string;

  deltaLabel: string;
  deltaValor: number | null;
  deltaSufixo?: string;
  /** Se `true`, aumento no delta é bom (raro). Default: aumento é ruim. */
  positivoBom?: boolean;

  municipioCriticoNome: string | null;
  municipioCriticoValor: string | null;
  municipioCriticoLink: string;

  proximaAtualizacaoLabel: string;
  ultimaAtualizacaoLabel: string;

  dashboardHref: string;
  dashboardCta?: string;
}

export function KpiAncora(props: KpiAncoraProps) {
  const bomAumento = props.positivoBom ?? false;
  const deltaBom =
    props.deltaValor === null
      ? null
      : bomAumento
        ? props.deltaValor > 0
        : props.deltaValor < 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-h-[188px]"
    >
      {/* Bloco 1 — KPI-âncora */}
      <motion.div
        variants={fadeSlideUp}
        className="relative overflow-hidden rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
          style={{ backgroundColor: props.kpiCorTema }}
        />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          {props.kpiLabel}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="text-5xl font-semibold tabular-nums tracking-tight"
            style={{ color: props.kpiCorTema }}
          >
            {props.kpiValor}
          </span>
          {props.kpiSufixo && (
            <span className="text-lg font-medium text-[var(--text-muted)]">
              {props.kpiSufixo}
            </span>
          )}
        </div>
        {props.kpiDescricao && (
          <p className="mt-3 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
            {props.kpiDescricao}
          </p>
        )}
        <Link
          href={props.dashboardHref}
          className="mt-4 inline-flex items-center gap-1 rounded-full border bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text)] hover:bg-[var(--elevated)]"
        >
          {props.dashboardCta ?? "Ver dashboard completo"}
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </motion.div>

      {/* Bloco 2 — Delta */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          {props.deltaLabel}
        </p>
        {props.deltaValor === null ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">sem período anterior</p>
        ) : (
          <div className="mt-2 flex items-baseline gap-2">
            {deltaBom ? (
              <ArrowDownRight className="h-6 w-6 text-emerald-500" strokeWidth={2} />
            ) : (
              <ArrowUpRight className="h-6 w-6 text-red-500" strokeWidth={2} />
            )}
            <span className="text-3xl font-semibold tabular-nums text-[var(--text)]">
              {props.deltaValor > 0 ? "+" : ""}
              {formatNumber(props.deltaValor)}
            </span>
            {props.deltaSufixo && (
              <span className="text-sm text-[var(--text-muted)]">{props.deltaSufixo}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* Bloco 3 — Município crítico */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Município crítico agora
        </p>
        {props.municipioCriticoNome ? (
          <>
            <p className="mt-2 truncate text-xl font-semibold text-[var(--text)]" title={props.municipioCriticoNome}>
              {props.municipioCriticoNome}
            </p>
            {props.municipioCriticoValor && (
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {props.municipioCriticoValor}
              </p>
            )}
            <Link
              href={props.municipioCriticoLink}
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text)] hover:underline"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
              Ver processos relacionados
              <ArrowRight className="h-3 w-3" strokeWidth={2} />
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">sem dado</p>
        )}
      </motion.div>

      {/* Bloco 4 — Ritmo da base */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Ritmo da base
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text)]">
          <span className="font-semibold">Atualizado {props.ultimaAtualizacaoLabel}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Próxima janela {props.proximaAtualizacaoLabel}
        </p>
      </motion.div>
    </motion.div>
  );
}
