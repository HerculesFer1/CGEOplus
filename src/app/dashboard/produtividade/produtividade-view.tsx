"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type {
  AnaliseMensal,
  DistribuicaoSistema,
  ProdutividadeServidor,
} from "@/lib/services/dashboard.service";

const NUCLEO_COLORS: Record<string, "accent" | "success" | "warning" | "danger" | "default"> = {
  Coordenacao: "accent",
  Licenciamento: "success",
  CAR: "warning",
  Fiscalizacao: "danger",
  Administrativo: "default",
};

interface Props {
  servidores: ProdutividadeServidor[];
  mensal: AnaliseMensal[];
  sistemas: DistribuicaoSistema[];
}

export function ProdutividadeView({ servidores, mensal }: Props) {
  const top10 = servidores.slice(0, 10);
  const totalAnalisesUltimos6M = mensal.reduce((s, m) => s + m.total, 0);
  const mediaMensal = mensal.length > 0 ? totalAnalisesUltimos6M / mensal.length : 0;

  const chartData = top10.map((s) => ({
    apelido: s.apelido,
    finalizados: s.finalizados,
    pendencias: s.pendencias,
    total: s.totalAnalises,
  }));

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div variants={fadeSlideUp}>
        <p className="text-sm text-[var(--text-muted)]">Visão geral</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Produtividade
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Ranking por volume de análises registradas, com breakdown de status.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-3">
        <StatCard
          variants={fadeSlideUp}
          label="Média mensal (últimos 6 m)"
          value={Math.round(mediaMensal)}
          hint={`${formatNumber(totalAnalisesUltimos6M)} análises no período`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          variants={fadeSlideUp}
          label="Servidores com análises"
          value={servidores.filter((s) => s.totalAnalises > 0).length}
          hint={`de ${servidores.length} total`}
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          variants={fadeSlideUp}
          label="Líder de análises"
          value={servidores[0]?.totalAnalises ?? 0}
          hint={servidores[0]?.apelido ?? "—"}
          icon={<Trophy className="h-4 w-4" />}
        />
      </motion.div>

      {/* Chart: Top 10 */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Top 10 analistas</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Barras empilhadas — verde: finalizados · laranja: com pendência.
            </p>
          </div>
        </div>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="apelido"
                stroke="var(--text-muted)"
                fontSize={11}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--elevated)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                cursor={{ fill: "var(--surface)" }}
              />
              <Bar dataKey="finalizados" stackId="r" fill="var(--success)" />
              <Bar dataKey="pendencias" stackId="r" fill="var(--warning)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Full table */}
      <motion.div variants={fadeSlideUp}>
        <h2 className="mb-3 text-lg font-semibold">Ranking completo</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Núcleo</TableHead>
              <TableHead className="text-right">Finalizados</TableHead>
              <TableHead className="text-right">Pendências</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% Finalizados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servidores.map((s, i) => {
              const pct =
                s.totalAnalises > 0
                  ? (s.finalizados / s.totalAnalises) * 100
                  : 0;
              return (
                <TableRow key={s.servidorId}>
                  <TableCell className="font-mono text-[var(--text-muted)]">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{s.apelido}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.nome}</p>
                  </TableCell>
                  <TableCell>
                    {s.nucleoPrincipal && (
                      <Badge variant={NUCLEO_COLORS[s.nucleoPrincipal] ?? "default"}>
                        {s.nucleoPrincipal}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(s.finalizados)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--text-muted)]">
                    {formatNumber(s.pendencias)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatNumber(s.totalAnalises)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        pct >= 70
                          ? "text-[var(--success)]"
                          : pct >= 40
                          ? "text-[var(--warning)]"
                          : "text-[var(--danger)]"
                      }
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  variants,
  label,
  value,
  hint,
  icon,
}: {
  variants: typeof fadeSlideUp;
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--accent)]">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-xs text-[var(--text-subtle)]">{hint}</p>
    </motion.div>
  );
}
