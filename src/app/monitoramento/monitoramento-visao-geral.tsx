"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeSlideUp, spring, staggerContainer } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type { ResumoIntervalo } from "@/lib/monitoramento/queries";

interface Programa {
  sigla: string;
  nome: string;
  orgao: string | null;
}

interface ResumoPrograma {
  programa: Programa;
  intervalos: ResumoIntervalo[];
}

interface Props {
  programas: Programa[];
  resumos: ResumoPrograma[];
}

function totalizarPrograma(intervalos: ResumoIntervalo[]) {
  return intervalos.reduce(
    (acc, i) => ({
      titulos: acc.titulos + i.titulos_total,
      car: acc.car + i.car_total,
      familias: acc.familias + i.familias_total,
      validados: acc.validados + i.validados_total,
      comunidades: acc.comunidades + i.comunidades_total,
      metaCar: acc.metaCar + (i.meta_car ?? 0),
      metaFamilias: acc.metaFamilias + (i.meta_familias ?? 0),
      intervalos: acc.intervalos + 1,
    }),
    {
      titulos: 0,
      car: 0,
      familias: 0,
      validados: 0,
      comunidades: 0,
      metaCar: 0,
      metaFamilias: 0,
      intervalos: 0,
    },
  );
}

export function MonitoramentoVisaoGeral({ programas, resumos }: Props) {
  const totalGeral = resumos.reduce(
    (acc, r) => {
      const t = totalizarPrograma(r.intervalos);
      return {
        titulos: acc.titulos + t.titulos,
        car: acc.car + t.car,
        familias: acc.familias + t.familias,
        validados: acc.validados + t.validados,
      };
    },
    { titulos: 0, car: 0, familias: 0, validados: 0 },
  );

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div variants={fadeSlideUp}>
        <p className="text-sm text-[var(--text-muted)]">Monitoramento</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Visão geral dos projetos
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
          Comparativo consolidado dos projetos de titulação em execução.
          Selecione um projeto para ver o dashboard completo por intervalo e
          comunidade.
        </p>
      </motion.div>

      <motion.div
        variants={fadeSlideUp}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiTotal
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
          label="Títulos (todos os projetos)"
          value={totalGeral.titulos}
        />
        <KpiTotal
          icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
          label="CAR emitidos"
          value={totalGeral.car}
        />
        <KpiTotal
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          label="Famílias atendidas"
          value={totalGeral.familias}
        />
        <KpiTotal
          icon={<BadgeCheck className="h-4 w-4" strokeWidth={1.75} />}
          label="Validados SICAR"
          value={totalGeral.validados}
        />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        className="grid gap-4 md:grid-cols-2"
      >
        {resumos.map((r) => (
          <ProjetoCard key={r.programa.sigla} resumo={r} />
        ))}
      </motion.div>

      {programas.length === 0 && (
        <motion.div
          variants={fadeSlideUp}
          className="rounded-2xl border bg-[var(--elevated)] p-8 text-center text-sm text-[var(--text-muted)]"
        >
          Nenhum projeto ativo cadastrado.
        </motion.div>
      )}
    </motion.div>
  );
}

function KpiTotal({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <motion.div
      variants={fadeSlideUp}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      className="rounded-2xl border bg-[var(--elevated)] p-5 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-muted)]">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {formatNumber(value)}
      </p>
    </motion.div>
  );
}

function ProjetoCard({ resumo }: { resumo: ResumoPrograma }) {
  const { programa, intervalos } = resumo;
  const t = totalizarPrograma(intervalos);
  const pctCar = t.metaCar > 0 ? t.car / t.metaCar : null;
  const pctFam = t.metaFamilias > 0 ? t.familias / t.metaFamilias : null;
  const comunidadesUnicas = new Set(
    intervalos.map((i) => `${i.intervalo_id}`),
  ).size; // aprox. — não temos comunidade_id na view de intervalo
  const href = `/monitoramento?programa=${encodeURIComponent(programa.sigla)}`;

  return (
    <motion.div
      variants={fadeSlideUp}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{programa.sigla}</h3>
            {programa.orgao && (
              <Badge variant="outline" className="shrink-0">
                {programa.orgao}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {programa.nome}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>
            Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniKpi
          icon={<TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Títulos"
          value={t.titulos}
        />
        <MiniKpi
          icon={<Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="CAR emitidos"
          value={t.car}
          hint={
            t.metaCar > 0
              ? `Meta ${formatNumber(t.metaCar)}`
              : undefined
          }
          badge={pctCar !== null ? `${(pctCar * 100).toFixed(1)}%` : undefined}
          tone={pctTone(pctCar)}
        />
        <MiniKpi
          icon={<Users className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Famílias"
          value={t.familias}
          hint={
            t.metaFamilias > 0
              ? `Meta ${formatNumber(t.metaFamilias)}`
              : undefined
          }
          badge={pctFam !== null ? `${(pctFam * 100).toFixed(1)}%` : undefined}
          tone={pctTone(pctFam)}
        />
        <MiniKpi
          icon={<BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Validados SICAR"
          value={t.validados}
        />
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Target className="h-3 w-3" strokeWidth={1.75} />
          {t.intervalos} intervalo{t.intervalos === 1 ? "" : "s"}
        </span>
        {comunidadesUnicas > 0 && (
          <span>
            {t.intervalos > 0
              ? `${formatNumber(t.comunidades)} comunidades registradas`
              : ""}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function pctTone(v: number | null): "success" | "warning" | "default" {
  if (v === null) return "default";
  if (v >= 1) return "success";
  if (v >= 0.7) return "warning";
  return "default";
}

function MiniKpi({
  icon,
  label,
  value,
  hint,
  badge,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  badge?: string;
  tone?: "success" | "warning" | "default";
}) {
  const badgeVariant =
    tone === "success" ? "success" : tone === "warning" ? "warning" : "outline";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tabular-nums">
          {formatNumber(value)}
        </span>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>
      {hint && (
        <p className="mt-0.5 text-[10px] text-[var(--text-subtle)]">{hint}</p>
      )}
    </div>
  );
}
