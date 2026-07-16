"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import type { MunicipioMapbiomas } from "@/lib/monit-ext/queries";
import { formatNumber } from "@/lib/utils";

interface SerieRow {
  ano: number;
  ipiPct: string;
  areaIrregularHa: string;
  areaTotalHa: string;
}

interface Props {
  serie: SerieRow[];
  top: MunicipioMapbiomas[];
  corTema: string;
}

/**
 * Duas visualizações-âncora do aparato geral do MapBiomas:
 *   1. Queda do IPI ao longo dos anos (line chart) — a história macro
 *   2. Top 6 municípios com maior área irregular (bar horizontal) — quem
 *      concentra o problema
 * Ambos entram com stagger para reforçar o storytelling da página.
 */
export function MapbiomasLandingCharts({ serie, top, corTema }: Props) {
  const serieData = serie.map((s) => ({
    ano: s.ano,
    ipi: Number(s.ipiPct),
    irregular: Math.round(Number(s.areaIrregularHa)),
    total: Math.round(Number(s.areaTotalHa)),
  }));

  const topData = top.map((m) => ({
    nome: m.municipio,
    irregular: Math.round(Number(m.haIrregular)),
    pct: Number(m.pctIrregular),
  }));

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 lg:grid-cols-2"
    >
      {/* IPI ao longo dos anos */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <header className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              História do IPI
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text)]">
              Queda da pressão irregular
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-subtle)]">% da área desmatada</span>
        </header>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={serieData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="ano"
                stroke="var(--text-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<TooltipCard corTema={corTema} sufixo="%" />} />
              <Line
                type="monotone"
                dataKey="ipi"
                stroke={corTema}
                strokeWidth={2.5}
                dot={{ r: 4, fill: corTema, stroke: "var(--elevated)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top 6 municípios com maior pressão */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <header className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              Concentração municipal
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text)]">
              Top 6 · maior área irregular
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-subtle)]">ha</span>
        </header>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={topData} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--text-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
              <YAxis
                type="category"
                dataKey="nome"
                stroke="var(--text-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={130}
                interval={0}
              />
              <Tooltip content={<TooltipCard corTema={corTema} sufixo=" ha" />} />
              <Bar dataKey="irregular" radius={[0, 4, 4, 0]}>
                {topData.map((_, i) => (
                  <Cell key={i} fill={corTema} fillOpacity={0.85 - i * 0.08} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface TooltipPayloadItem {
  value: number | string;
  dataKey?: string;
}

function TooltipCard({
  active,
  payload,
  label,
  corTema,
  sufixo,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  corTema: string;
  sufixo?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-[var(--elevated)] px-3 py-2 shadow-[var(--shadow-md)]">
      <div className="text-[11px] font-semibold text-[var(--text)]">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="mt-0.5 text-[11px]" style={{ color: corTema }}>
          <span className="tabular-nums">{formatNumber(Number(p.value))}</span>
          {sufixo && <span className="ml-0.5 text-[var(--text-muted)]">{sufixo}</span>}
        </div>
      ))}
    </div>
  );
}
