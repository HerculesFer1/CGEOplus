"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  FileText,
  CheckCircle2,
  Target,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type {
  AnaliseMensal,
  DistribuicaoSistema,
  KpiOverview,
  ProdutividadeServidor,
} from "@/lib/services/dashboard.service";
import type { MetaComProgresso } from "@/lib/services/metas.service";
import {
  TIPO_EVENTO_COR,
  TIPO_EVENTO_LABEL,
  type TipoEvento,
} from "@/lib/validators/evento";
import { META_METRICA_LABEL } from "@/lib/validators/meta";

const SISTEMA_COLORS: Record<string, string> = {
  SEI: "#0A84FF",
  SIGA: "#32D74B",
  SICAR: "#FF9F0A",
  SINAFLOR: "#FF453A",
};

const MONTH_ABBR: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};
function shortMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MONTH_ABBR[m] ?? m}/${ano.slice(2)}`;
}

interface EventoProximo {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  local: string | null;
  inicioIso: string;
  diaInteiro: boolean;
}

interface Props {
  kpis: KpiOverview;
  mensal: AnaliseMensal[];
  sistemas: DistribuicaoSistema[];
  topServidores: ProdutividadeServidor[];
  metasAtivas: MetaComProgresso[];
  proximosEventos: EventoProximo[];
}

export function DashboardOverview({
  kpis,
  mensal,
  sistemas,
  topServidores,
  metasAtivas,
  proximosEventos,
}: Props) {
  const mensalChart = mensal.map((m) => ({ ...m, mesLabel: shortMes(m.mes) }));
  const maxServidor = Math.max(...topServidores.map((s) => s.totalAnalises), 1);
  const metasPorFarol = metasAtivas.reduce(
    (acc, m) => {
      acc[m.farol]++;
      return acc;
    },
    { verde: 0, amarelo: 0, vermelho: 0 } as Record<
      MetaComProgresso["farol"],
      number
    >,
  );

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
          Overview institucional
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Indicadores consolidados de estrutura, produtividade e capacidade —
          dados em tempo real.
        </p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-4">
        <KpiCard
          variants={fadeSlideUp}
          icon={<Activity className="h-4 w-4" strokeWidth={1.75} />}
          label="Análises no mês"
          value={kpis.analisesMesAtual}
          delta={kpis.deltaPercentual}
          hint={`vs. ${formatNumber(kpis.analisesMesAnterior)} no mês anterior`}
        />
        <KpiCard
          variants={fadeSlideUp}
          icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
          label="Processos únicos"
          value={kpis.totalProcessos}
          hint="acumulado desde jun/2025"
        />
        <KpiCard
          variants={fadeSlideUp}
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
          label="Taxa de finalizados"
          value={kpis.taxaFinalizados}
          unit="%"
          decimals={1}
          hint={`${formatNumber(kpis.totalAnalises)} análises`}
        />
        <KpiCard
          variants={fadeSlideUp}
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          label="Servidores ativos"
          value={kpis.totalServidoresAtivos}
          hint="multi-núcleo"
        />
      </motion.div>

      {/* Chart: Produtividade mensal */}
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Produtividade mensal</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Análises por mês nos últimos 12 meses, discriminadas por resultado.
            </p>
          </div>
          <div className="flex gap-3 text-xs text-[var(--text-muted)]">
            <LegendDot color="var(--success)" label="Finalizados" />
            <LegendDot color="var(--warning)" label="Pendências" />
            <LegendDot color="var(--danger)" label="Indeferidos" />
          </div>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mensalChart} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="mesLabel"
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
                labelStyle={{ color: "var(--text)" }}
                cursor={{ fill: "var(--surface)" }}
              />
              <Bar dataKey="finalizados" stackId="r" fill="var(--success)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pendencias" stackId="r" fill="var(--warning)" />
              <Bar dataKey="indeferidos" stackId="r" fill="var(--danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Metas ativas + Próximos eventos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MetasAtivasCard metas={metasAtivas} porFarol={metasPorFarol} />
        <ProximosEventosCard eventos={proximosEventos} />
      </div>

      {/* Bottom: distribuição + ranking */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição por sistema */}
        <motion.div
          variants={fadeSlideUp}
          className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-lg font-semibold">Distribuição por sistema</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {formatNumber(kpis.totalProcessos)} processos únicos.
          </p>
          <div className="mt-4 flex items-center gap-6">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sistemas}
                    dataKey="total"
                    nameKey="sistema"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="var(--elevated)"
                    strokeWidth={2}
                  >
                    {sistemas.map((s) => (
                      <Cell
                        key={s.sistema}
                        fill={SISTEMA_COLORS[s.sistema] ?? "#8E8E93"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--elevated)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {sistemas.map((s) => (
                <div key={s.sistema} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: SISTEMA_COLORS[s.sistema] }}
                    />
                    <span className="text-sm font-medium">{s.sistema}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono">{formatNumber(s.total)}</span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {s.percentual.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top analistas */}
        <motion.div
          variants={fadeSlideUp}
          className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-lg font-semibold">Top analistas</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Por volume total de análises registradas.
          </p>
          <div className="mt-4 space-y-3">
            {topServidores.map((s) => (
              <div key={s.servidorId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{s.apelido}</span>
                    {s.nucleoPrincipal && (
                      <Badge className="ml-2" variant="outline">
                        {s.nucleoPrincipal}
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-sm">
                    {formatNumber(s.totalAnalises)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--accent)" }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(s.totalAnalises / maxServidor) * 100}%`,
                    }}
                    transition={{ ...spring.gentle, delay: 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

interface KpiCardProps {
  variants: typeof fadeSlideUp;
  icon: React.ReactNode;
  label: string;
  value: number;
  delta?: number;
  unit?: string;
  decimals?: number;
  hint?: string;
}

function KpiCard({
  variants,
  icon,
  label,
  value,
  delta,
  unit,
  decimals = 0,
  hint,
}: KpiCardProps) {
  const trend = delta !== undefined ? (delta >= 0 ? "up" : "down") : null;
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)]">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">
          {decimals > 0
            ? value.toLocaleString("pt-BR", {
                maximumFractionDigits: decimals,
              })
            : formatNumber(Math.round(value))}
        </span>
        {unit && (
          <span className="text-lg text-[var(--text-muted)]">{unit}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              trend === "up" ? "text-[var(--success)]" : "text-[var(--danger)]"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="h-3 w-3" strokeWidth={2.5} />
            )}
            {delta! >= 0 ? "+" : ""}
            {delta!.toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[var(--text-subtle)]">{hint}</span>}
      </div>
    </motion.div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Metas ativas — resumo com farol + top 3 metas em risco
   -------------------------------------------------------------------------- */

const FAROL_COR: Record<MetaComProgresso["farol"], string> = {
  verde: "var(--success)",
  amarelo: "var(--warning)",
  vermelho: "var(--danger)",
};

function MetasAtivasCard({
  metas,
  porFarol,
}: {
  metas: MetaComProgresso[];
  porFarol: Record<MetaComProgresso["farol"], number>;
}) {
  // Ordena por "urgência": vermelho primeiro, depois amarelo, depois verde;
  // dentro de cada farol, menor pctAtingido primeiro.
  const ordenadas = [...metas].sort((a, b) => {
    const rank = { vermelho: 0, amarelo: 1, verde: 2 } as const;
    const r = rank[a.farol] - rank[b.farol];
    if (r !== 0) return r;
    return a.percentualAtingido - b.percentualAtingido;
  });
  const destaque = ordenadas.slice(0, 3);

  return (
    <motion.div
      variants={fadeSlideUp}
      className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <Target className="h-4 w-4" strokeWidth={1.75} />
            Metas ativas
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {metas.length === 0
              ? "Nenhuma meta cadastrada para o período atual."
              : `${metas.length} meta${metas.length === 1 ? "" : "s"} · progresso calculado agora.`}
          </p>
        </div>
        <Link
          href="/metas"
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Ver todas
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>

      {metas.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-center">
          <Target
            className="mx-auto h-6 w-6 text-[var(--text-subtle)]"
            strokeWidth={1.25}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Cadastre metas no menu Gestão → Metas para acompanhar aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Contadores por farol */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(["verde", "amarelo", "vermelho"] as const).map((f) => (
              <div
                key={f}
                className="rounded-xl border bg-[var(--surface)]/40 p-3"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: FAROL_COR[f] }}
                  />
                  {f === "verde"
                    ? "No ritmo"
                    : f === "amarelo"
                    ? "Atrasadas"
                    : "Em risco"}
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tabular-nums"
                  style={{ color: FAROL_COR[f] }}
                >
                  {porFarol[f]}
                </div>
              </div>
            ))}
          </div>

          {/* Top 3 mais urgentes */}
          <div className="mt-5 space-y-3">
            {destaque.map((m) => {
              const isTaxa = m.metrica === "taxa_finalizacao";
              const pctLim = Math.min(100, m.percentualAtingido);
              return (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 text-sm">
                      <span className="font-medium">{m.alvoNome}</span>
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        · {META_METRICA_LABEL[m.metrica]} · {m.periodoLabel}
                      </span>
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: FAROL_COR[m.farol] }}
                    >
                      {isTaxa
                        ? `${m.realizado.toFixed(1)}%`
                        : `${Math.round(m.realizado)}/${m.valorAlvo}`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: FAROL_COR[m.farol] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pctLim}%` }}
                      transition={{ ...spring.gentle, delay: 0.1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}

/* --------------------------------------------------------------------------
   Próximos eventos — cronograma compacto
   -------------------------------------------------------------------------- */

const DIA_SEMANA_ABBR = [
  "dom",
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
] as const;

function ProximosEventosCard({ eventos }: { eventos: EventoProximo[] }) {
  return (
    <motion.div
      variants={fadeSlideUp}
      className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
            Próximos eventos
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {eventos.length === 0
              ? "Nenhum evento agendado."
              : `${eventos.length} evento${eventos.length === 1 ? "" : "s"} no horizonte próximo.`}
          </p>
        </div>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Ver agenda
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>

      {eventos.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-6 text-center">
          <CalendarClock
            className="mx-auto h-6 w-6 text-[var(--text-subtle)]"
            strokeWidth={1.25}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Cadastre eventos no menu Gestão → Eventos.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {eventos.map((e) => {
            const d = new Date(e.inicioIso);
            const hh = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
            return (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-xl border-l-2 bg-[var(--surface)]/40 p-3"
                style={{ borderLeftColor: TIPO_EVENTO_COR[e.tipo] }}
              >
                <div className="min-w-[42px] shrink-0 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    {DIA_SEMANA_ABBR[d.getDay()]}
                  </div>
                  <div className="text-xl font-semibold tabular-nums leading-none">
                    {d.getDate()}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase text-[var(--text-subtle)]">
                    {MONTH_ABBR[String(d.getMonth() + 1).padStart(2, "0")]}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {e.titulo}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text)]">
                      {e.diaInteiro ? "dia inteiro" : hh}
                    </span>
                    <span>·</span>
                    <span>{TIPO_EVENTO_LABEL[e.tipo]}</span>
                    {e.local && (
                      <>
                        <span>·</span>
                        <span className="truncate">{e.local}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
