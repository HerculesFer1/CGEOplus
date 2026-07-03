"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
} from "lucide-react";

import {
  fadeSlideUp,
  staggerContainer,
  spring,
} from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";

const KPIS = [
  {
    label: "Processos no mês",
    value: 888,
    delta: "+11.8%",
    trend: "up" as const,
    hint: "vs. média 2025 (790/mês)",
    icon: Activity,
  },
  {
    label: "Análises N3 (alta complexidade)",
    value: 60.7,
    unit: "%",
    delta: "+2.1pp",
    trend: "up" as const,
    hint: "17 de 28 atividades",
    icon: TrendingUp,
  },
  {
    label: "Índice de sobrecarga",
    value: 74,
    unit: "/100",
    delta: "Alto",
    trend: "warning" as const,
    hint: "Núcleos Fiscalização e CAR no limite",
    icon: AlertTriangle,
  },
];

export default function DashboardPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={fadeSlideUp}>
        <p className="text-sm text-[var(--text-muted)]">Visão geral</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Overview institucional
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Indicadores consolidados de estrutura, produtividade e capacidade.
        </p>
      </motion.div>

      {/* KPIs */}
      <motion.div
        variants={staggerContainer}
        className="grid gap-4 md:grid-cols-3"
      >
        {KPIS.map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={fadeSlideUp}
            whileHover={{ y: -2 }}
            transition={spring.gentle}
            className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between">
              <span className="text-sm text-[var(--text-muted)]">
                {kpi.label}
              </span>
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)]">
                <kpi.icon
                  className="h-4 w-4 text-[var(--accent)]"
                  strokeWidth={1.75}
                />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">
                {formatNumber(kpi.value)}
              </span>
              {kpi.unit && (
                <span className="text-lg text-[var(--text-muted)]">
                  {kpi.unit}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span
                className={
                  kpi.trend === "warning"
                    ? "font-medium text-[var(--warning)]"
                    : "font-medium text-[var(--success)]"
                }
              >
                {kpi.delta}
              </span>
              <span className="text-[var(--text-subtle)]">{kpi.hint}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Placeholder para gráficos */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border bg-[var(--elevated)] p-8 shadow-[var(--shadow-sm)]"
      >
        <h2 className="text-lg font-semibold">Produtividade mensal</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Após conectar Supabase e importar a planilha, o gráfico será alimentado
          por dados reais.
        </p>
        <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-[var(--text-subtle)]">
          Recharts será plugado aqui na próxima sprint
        </div>
      </motion.div>
    </motion.div>
  );
}
