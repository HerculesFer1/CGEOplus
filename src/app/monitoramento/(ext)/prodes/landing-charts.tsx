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

interface Ciclo {
  anoProdesRef: number;
  pctConcordancia: string | null;
  nTotal: number;
}
interface TopMun {
  municipio: string;
  pctConcordancia: string | null;
  totalHa: string;
}

interface Props {
  ciclos: Ciclo[];
  top: TopMun[];
  corTema: string;
}

export function ProdesLandingCharts({ ciclos, top, corTema }: Props) {
  // Só ciclos publicados (com validação cruzada concluída); ciclo do ano
  // corrente pode existir com pctConcordancia="0.00" enquanto o PRODES
  // não publica em outubro — filtrar por nTotal > 0.
  const serie = ciclos
    .filter((c) => c.nTotal > 0)
    .map((c) => ({ ano: c.anoProdesRef, pct: Number(c.pctConcordancia) }));

  const topData = top.slice(0, 6).map((m) => ({
    nome: m.municipio,
    pct: Number(m.pctConcordancia ?? 0),
    total: Math.round(Number(m.totalHa)),
  }));

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 lg:grid-cols-2"
    >
      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <header className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              Alinhamento entre bases
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text)]">
              Concordância PRODES × MapBiomas
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-subtle)]">% de alertas confirmados</span>
        </header>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ano" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="var(--text-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "concordância"]}
                contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="pct"
                stroke={corTema}
                strokeWidth={2.5}
                dot={{ r: 4, fill: corTema, stroke: "var(--elevated)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        variants={fadeSlideUp}
        className="rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <header className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              Concordância por município
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text)]">
              Top 6 — maior área validada
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-subtle)]">%</span>
        </header>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={topData} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="var(--text-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
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
              <Tooltip
                formatter={(v) => `${v}%`}
                contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
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

