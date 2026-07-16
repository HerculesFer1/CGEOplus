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
import { formatNumber } from "@/lib/utils";

interface SerieAno {
  ano: number;
  areaQueimadaHa: string;
  nCicatrizes: number;
}
interface TopMun {
  municipioCod: string;
  municipioNome: string;
  areaQueimadaTotalHa: string;
  emAlerta: boolean | null;
  classeMaxQueimada: number | null;
}

interface Props {
  serie: SerieAno[];
  top: TopMun[];
  corTema: string;
}

export function QueimadasLandingCharts({ serie, top, corTema }: Props) {
  const serieData = serie.map((s) => ({
    ano: s.ano,
    area: Math.round(Number(s.areaQueimadaHa)),
    cicatrizes: s.nCicatrizes,
  }));

  const topData = top.map((m) => ({
    nome: m.municipioNome,
    area: Math.round(Number(m.areaQueimadaTotalHa)),
    emAlerta: !!m.emAlerta,
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
              Área queimada estadual
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text)]">
              Evolução anual · hectares
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-subtle)]">ha</span>
        </header>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={serieData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ano" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={(v, name) => name === "area" ? `${formatNumber(Number(v))} ha` : formatNumber(Number(v))}
              />
              <Line
                type="monotone"
                dataKey="area"
                stroke={corTema}
                strokeWidth={2.5}
                name="Área"
                dot={{ r: 4, fill: corTema, stroke: "var(--elevated)", strokeWidth: 2 }}
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
              Concentração municipal
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-[var(--text)]">
              Top 6 · maior área queimada
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-subtle)]">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: corTema }} />
              padrão
            </span>
            {" · "}
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-red-500" />
              em alerta CGEO+
            </span>
          </span>
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
              <Tooltip
                contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => `${formatNumber(Number(v))} ha`}
              />
              <Bar dataKey="area" radius={[0, 4, 4, 0]}>
                {topData.map((d, i) => (
                  <Cell key={i} fill={d.emAlerta ? "#EF4444" : corTema} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}
