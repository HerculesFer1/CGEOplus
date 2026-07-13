"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Gauge,
  Layers,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeSlideUp, spring, staggerContainer } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type { CarImportacaoResumo } from "@/lib/car/importer";
import type { CarImportacaoResumida } from "@/lib/car/queries";
import type { CarBucket } from "@/lib/car/types";

/* ── Constantes visuais ──────────────────────────────────────────────────── */

const SICAR = "#FF9F0A";
const BUCKET_LABEL: Record<CarBucket, string> = {
  AG_GESTOR: "Aguardando Gestor",
  PENDENTE: "Aguardando Empreendedor",
  VALIDADO: "Validados",
  CANCELADO: "Cancelados",
  SUSPENSO: "Suspensos",
  NAO_CLASSIFICADO: "Não classificados",
};

const BUCKET_COLOR: Record<CarBucket, string> = {
  AG_GESTOR: "#FF453A", // danger
  PENDENTE: "#FF9F0A", // warning / SICAR
  VALIDADO: "#30D158", // success
  CANCELADO: "#8E8E93", // muted
  SUSPENSO: "#636366", // subtle
  NAO_CLASSIFICADO: "#FFB020", // atenção
};

const MESES = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez",
];

const MESES_LONGOS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const NE_UFS = new Set(["CE","PI","AL","PB","PE","MA","SE","RN","BA"]);

/* ── Props ───────────────────────────────────────────────────────────────── */

interface Props {
  ultima: CarImportacaoResumida;
  historico: Array<{ ano: number; mes: number; totalRegistros: number; resumo: CarImportacaoResumo }>;
  ufRanking: Array<{ uf: string; total: number; temaRotulo: string }>;
}

/* ── View ────────────────────────────────────────────────────────────────── */

export function CarDashboardView({ ultima, historico, ufRanking }: Props) {
  const { resumo } = ultima;
  const mesLabel = `${MESES[ultima.mes - 1]}/${String(ultima.ano).slice(2)}`;

  const totalConcluidas =
    resumo.totalPorBucket.VALIDADO +
    resumo.totalPorBucket.CANCELADO +
    resumo.totalPorBucket.PENDENTE;

  const pctPorBucket = useMemo(() => {
    const t = ultima.totalRegistros || 1;
    return Object.fromEntries(
      Object.entries(resumo.totalPorBucket).map(([b, n]) => [b, (n / t) * 100]),
    ) as Record<CarBucket, number>;
  }, [resumo.totalPorBucket, ultima.totalRegistros]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-10"
    >
      <Header ultima={ultima} />

      {resumo.fasesNaoClassificadas.length > 0 && (
        <FasesNaoClassificadasBanner
          fases={resumo.fasesNaoClassificadas}
          importacaoId={ultima.id}
        />
      )}

      <VisaoGeral
        resumo={resumo}
        totalRegistros={ultima.totalRegistros}
        mesLabel={mesLabel}
        pctPorBucket={pctPorBucket}
        totalConcluidas={totalConcluidas}
        historico={historico}
      />

      <Benchmarking ufRanking={ufRanking} mesLabel={mesLabel} />

      <Funil
        resumo={resumo}
        totalRegistros={ultima.totalRegistros}
        pctPorBucket={pctPorBucket}
      />

      <EvolucaoTemporal historico={historico} />

      <CamadaMunicipal resumo={resumo} />

      <Diagnostico
        resumo={resumo}
        totalRegistros={ultima.totalRegistros}
        historico={historico}
      />
    </motion.div>
  );
}

/* ── Header ──────────────────────────────────────────────────────────────── */

function Header({ ultima }: { ultima: CarImportacaoResumida }) {
  const importadoEm = new Date(ultima.importadoEm).toLocaleString("pt-BR");
  return (
    <motion.div variants={fadeSlideUp} className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm text-[var(--text-muted)]">Painel SICAR-PI</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Análise de Passivo do CAR
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
          Referência{" "}
          <strong className="text-[var(--text)]">
            {MESES_LONGOS[ultima.mes - 1]} / {ultima.ano}
          </strong>{" "}
          · {formatNumber(ultima.totalRegistros)} registros · atualizado em{" "}
          {importadoEm}
        </p>
      </div>
      <Link href="/car/importar">
        <Button variant="outline">
          <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
          Nova importação
        </Button>
      </Link>
    </motion.div>
  );
}

/* ── Banner de fases não classificadas ───────────────────────────────────── */

function FasesNaoClassificadasBanner({
  fases,
  importacaoId,
}: {
  fases: Array<{ fase: string; count: number }>;
  importacaoId: string;
}) {
  const total = fases.reduce((sum, f) => sum + f.count, 0);
  return (
    <motion.div
      variants={fadeSlideUp}
      className="rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning)]/5 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]"
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">
            {fases.length === 1
              ? "1 fase nova do SICAR ainda não classificada"
              : `${fases.length} fases novas do SICAR ainda não classificadas`}
            {" — "}
            {formatNumber(total)} registros afetados
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            O SICAR alterou nomenclatura. Reimporte a planilha para atualizar o mapa
            e classificá-las corretamente. Importação: {importacaoId.slice(0, 8)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {fases.slice(0, 5).map((f) => (
              <Badge key={f.fase} variant="outline">
                <span className="max-w-[220px] truncate">{f.fase}</span>
                <span className="ml-1 text-[var(--text-muted)]">· {formatNumber(f.count)}</span>
              </Badge>
            ))}
            {fases.length > 5 && (
              <Badge variant="outline">+ {fases.length - 5}</Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Seção 1: Visão Geral ────────────────────────────────────────────────── */

function VisaoGeral({
  resumo,
  totalRegistros,
  mesLabel,
  pctPorBucket,
  totalConcluidas,
  historico,
}: {
  resumo: CarImportacaoResumo;
  totalRegistros: number;
  mesLabel: string;
  pctPorBucket: Record<CarBucket, number>;
  totalConcluidas: number;
  historico: Props["historico"];
}) {
  const spark = (getter: (r: CarImportacaoResumo) => number) =>
    historico.map((h) => ({ x: h.mes, y: getter(h.resumo) }));

  return (
    <SectionShell
      icon={<Gauge className="h-4 w-4" strokeWidth={1.75} />}
      title="Visão geral"
      subtitle={`Métricas principais do Piauí · ${mesLabel}`}
    >
      <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total de Registros"
          value={totalRegistros}
          spark={spark((r) => r.totalRegistros)}
          color={SICAR}
        />
        <KpiCard
          label="Aguardando Gestor"
          value={resumo.totalPorBucket.AG_GESTOR}
          hint={`${pctPorBucket.AG_GESTOR.toFixed(1)}% do total`}
          spark={spark((r) => r.totalPorBucket.AG_GESTOR)}
          color={BUCKET_COLOR.AG_GESTOR}
        />
        <KpiCard
          label="Análises Concluídas"
          value={totalConcluidas}
          hint={`${((totalConcluidas / totalRegistros) * 100).toFixed(1)}% do total`}
          color={BUCKET_COLOR.VALIDADO}
        />
        <KpiCard
          label="Aguardando Empreendedor"
          value={resumo.totalPorBucket.PENDENTE}
          hint={`${pctPorBucket.PENDENTE.toFixed(1)}% do total`}
          spark={spark((r) => r.totalPorBucket.PENDENTE)}
          color={BUCKET_COLOR.PENDENTE}
        />
        <KpiCard
          label="Validados"
          value={resumo.totalPorBucket.VALIDADO}
          hint={`${pctPorBucket.VALIDADO.toFixed(1)}% do total`}
          spark={spark((r) => r.totalPorBucket.VALIDADO)}
          color={BUCKET_COLOR.VALIDADO}
        />
        <KpiCard
          label="Cancelados"
          value={resumo.totalPorBucket.CANCELADO}
          hint={`${pctPorBucket.CANCELADO.toFixed(1)}% do total`}
          color={BUCKET_COLOR.CANCELADO}
        />
      </motion.div>

      {/* Donut de distribuição */}
      <motion.div
        variants={fadeSlideUp}
        className="mt-6 rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Distribuição do passivo</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Soma perfeita sobre {formatNumber(totalRegistros)} registros.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_1.5fr]">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(resumo.totalPorBucket)
                    .filter(([, n]) => n > 0)
                    .map(([b, n]) => ({
                      name: BUCKET_LABEL[b as CarBucket],
                      value: n,
                      bucket: b as CarBucket,
                    }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="var(--elevated)"
                  strokeWidth={2}
                >
                  {Object.entries(resumo.totalPorBucket)
                    .filter(([, n]) => n > 0)
                    .map(([b]) => (
                      <Cell key={b} fill={BUCKET_COLOR[b as CarBucket]} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatNumber(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-2 self-center sm:grid-cols-2">
            {(Object.keys(resumo.totalPorBucket) as CarBucket[])
              .filter((b) => resumo.totalPorBucket[b] > 0)
              .map((b) => (
                <div key={b} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: BUCKET_COLOR[b] }}
                    />
                    {BUCKET_LABEL[b]}
                  </span>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {formatNumber(resumo.totalPorBucket[b])} · {pctPorBucket[b].toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </motion.div>
    </SectionShell>
  );
}

/* ── Seção 2: Benchmarking Nacional ──────────────────────────────────────── */

function Benchmarking({
  ufRanking,
  mesLabel,
}: {
  ufRanking: Array<{ uf: string; total: number; temaRotulo: string }>;
  mesLabel: string;
}) {
  const [mostrarTodas, setMostrarTodas] = useState(false);

  if (ufRanking.length === 0) {
    return (
      <SectionShell
        icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
        title="Benchmarking nacional"
        subtitle="Comparativo entre as 27 UFs"
      >
        <motion.div
          variants={fadeSlideUp}
          className="flex flex-col items-center gap-4 rounded-2xl border bg-[var(--elevated)] p-8 text-center shadow-[var(--shadow-sm)]"
        >
          <p className="max-w-lg text-sm text-[var(--text-muted)]">
            Sem ranking nacional para {mesLabel}. Importe a planilha{" "}
            <code className="rounded bg-[var(--surface)] px-1 text-xs">UF · Total do Tema</code>
            {" "}pra posicionar o Piauí contra os outros estados.
          </p>
          <Link href="/car/importar?aba=ranking">
            <Button variant="outline">Importar ranking</Button>
          </Link>
        </motion.div>
      </SectionShell>
    );
  }

  const piRank = ufRanking.findIndex((r) => r.uf === "PI") + 1;
  const totalBrasil = ufRanking.reduce((s, r) => s + r.total, 0);
  const piValue = ufRanking.find((r) => r.uf === "PI")?.total ?? 0;
  const neSorted = ufRanking.filter((r) => NE_UFS.has(r.uf));
  const piNeRank = neSorted.findIndex((r) => r.uf === "PI") + 1;
  const temaRotulo = ufRanking[0]?.temaRotulo ?? "";

  return (
    <SectionShell
      icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
      title="Benchmarking nacional"
      subtitle={`${temaRotulo || "Comparativo entre as 27 UFs"} · ${mesLabel}`}
    >
      <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Ranking nacional"
          value={piRank}
          prefix="#"
          suffix="°"
          hint="Piauí · 27 UFs"
        />
        <KpiCard
          label="Ranking Nordeste"
          value={piNeRank}
          prefix="#"
          suffix="°"
          hint="Entre as 9 UFs do NE"
        />
        <KpiCard
          label="Análises concluídas PI"
          value={piValue}
          hint={`${((piValue / totalBrasil) * 100).toFixed(1)}% do Brasil`}
        />
        <KpiCard
          label="Total Brasil"
          value={totalBrasil}
          hint="Somatório das 27 UFs"
        />
      </motion.div>

      <motion.div
        variants={fadeSlideUp}
        className="mt-6 rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">
              {mostrarTodas ? "Ranking das 27 UFs" : "Top 10 UFs"}
            </h3>
            {temaRotulo && (
              <p className="text-xs text-[var(--text-muted)]">
                Tema: <strong className="text-[var(--text)]">{temaRotulo}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMostrarTodas((v) => !v)}
            className="rounded-md border px-2.5 py-1 text-xs text-[var(--text-muted)] transition-colors hover:border-[#FF9F0A]/50 hover:text-[var(--text)]"
          >
            {mostrarTodas ? "Ver top 10" : "Ver todas as 27"}
          </button>
        </div>
        {/* Top 10 fixo — legibilidade. Toggle expande pra 27 UFs (24px por linha). */}
        {(() => {
          const dados = mostrarTodas ? ufRanking : ufRanking.slice(0, 10);
          return (
            <div
              className="mt-4"
              style={{ height: `${Math.max(dados.length * 32 + 40, 320)}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dados}
                  layout="vertical"
                  margin={{ top: 8, right: 60, bottom: 8, left: 8 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="uf"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--surface)", opacity: 0.3 }}
                    formatter={(v) => [formatNumber(Number(v)), "Total"]}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {dados.map((r) => (
                      <Cell
                        key={r.uf}
                        fill={r.uf === "PI" ? SICAR : "var(--accent)"}
                        opacity={r.uf === "PI" ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
        {!mostrarTodas && ufRanking.findIndex((r) => r.uf === "PI") > 9 && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Piauí está fora do top 10 —{" "}
            <button
              type="button"
              onClick={() => setMostrarTodas(true)}
              className="underline underline-offset-2 hover:text-[var(--text)]"
            >
              ver todas as 27 UFs
            </button>
            .
          </p>
        )}
      </motion.div>
    </SectionShell>
  );
}

/* ── Seção 3: Funil ──────────────────────────────────────────────────────── */

function Funil({
  resumo,
  totalRegistros,
  pctPorBucket,
}: {
  resumo: CarImportacaoResumo;
  totalRegistros: number;
  pctPorBucket: Record<CarBucket, number>;
}) {
  const stages: Array<{ label: string; value: number; color: string; pct: number }> = [
    { label: "Total", value: totalRegistros, color: "#94A3B8", pct: 100 },
    {
      label: "Ag. Gestor",
      value: resumo.totalPorBucket.AG_GESTOR,
      color: BUCKET_COLOR.AG_GESTOR,
      pct: pctPorBucket.AG_GESTOR,
    },
    {
      label: "Ag. Empreendedor",
      value: resumo.totalPorBucket.PENDENTE,
      color: BUCKET_COLOR.PENDENTE,
      pct: pctPorBucket.PENDENTE,
    },
    {
      label: "Validados",
      value: resumo.totalPorBucket.VALIDADO,
      color: BUCKET_COLOR.VALIDADO,
      pct: pctPorBucket.VALIDADO,
    },
    {
      label: "Cancelados",
      value: resumo.totalPorBucket.CANCELADO,
      color: BUCKET_COLOR.CANCELADO,
      pct: pctPorBucket.CANCELADO,
    },
  ];
  const maxValue = totalRegistros;

  return (
    <SectionShell
      icon={<Layers className="h-4 w-4" strokeWidth={1.75} />}
      title="Funil de análise"
      subtitle="Fluxo Gestor → Empreendedor → Resolução"
    >
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="space-y-3">
          {stages.map((s) => {
            const w = (s.value / maxValue) * 100;
            return (
              <div key={s.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {formatNumber(s.value)} · {s.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-6 overflow-hidden rounded-lg bg-[var(--surface)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={spring.gentle}
                    className="h-full rounded-lg"
                    style={{ background: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </SectionShell>
  );
}

/* ── Seção 4: Evolução Temporal ──────────────────────────────────────────── */

function EvolucaoTemporal({ historico }: { historico: Props["historico"] }) {
  const data = historico.map((h) => ({
    label: `${MESES[h.mes - 1]}/${String(h.ano).slice(2)}`,
    total: h.totalRegistros,
    ag_gestor: h.resumo.totalPorBucket.AG_GESTOR,
    pendente: h.resumo.totalPorBucket.PENDENTE,
    validado: h.resumo.totalPorBucket.VALIDADO,
  }));

  return (
    <SectionShell
      icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
      title="Evolução temporal"
      subtitle="Série histórica das importações mensais"
    >
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        {data.length < 2 ? (
          <p className="p-6 text-center text-sm text-[var(--text-muted)]">
            A evolução temporal aparecerá após a segunda importação.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
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
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatNumber(Number(v))}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="ag_gestor"
                  name="Ag. Gestor"
                  stroke={BUCKET_COLOR.AG_GESTOR}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="pendente"
                  name="Ag. Empreendedor"
                  stroke={BUCKET_COLOR.PENDENTE}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="validado"
                  name="Validados"
                  stroke={BUCKET_COLOR.VALIDADO}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </SectionShell>
  );
}

/* ── Camada municipal (extra além do dashboard antigo) ──────────────────── */

function CamadaMunicipal({ resumo }: { resumo: CarImportacaoResumo }) {
  const [q, setQ] = useState("");
  const [ordenar, setOrdenar] = useState<"total" | "ag_gestor" | "pendente">(
    "total",
  );
  const [limite, setLimite] = useState<20 | 50 | 100>(20);

  const filtrado = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const base = qn
      ? resumo.porMunicipio.filter((m) =>
          m.municipio.toLowerCase().includes(qn),
        )
      : resumo.porMunicipio;

    const sorted = [...base].sort((a, b) => {
      if (ordenar === "total") return b.total - a.total;
      if (ordenar === "ag_gestor")
        return (b.porBucket.AG_GESTOR ?? 0) - (a.porBucket.AG_GESTOR ?? 0);
      return (b.porBucket.PENDENTE ?? 0) - (a.porBucket.PENDENTE ?? 0);
    });

    return sorted.slice(0, limite);
  }, [resumo.porMunicipio, q, ordenar, limite]);

  return (
    <SectionShell
      icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
      title="Camada municipal"
      subtitle={`Concentração de passivo por município · ${resumo.porMunicipio.length} municípios com registros`}
    >
      <motion.div
        variants={fadeSlideUp}
        className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            placeholder="Filtrar município…"
            className="flex-1 rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <Select value={ordenar} onValueChange={(v) => setOrdenar(v as typeof ordenar)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Ordenar por Total</SelectItem>
              <SelectItem value="ag_gestor">Ordenar por Ag. Gestor</SelectItem>
              <SelectItem value="pendente">Ordenar por Ag. Empreendedor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(limite)} onValueChange={(v) => setLimite(Number(v) as 20 | 50 | 100)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
              <SelectItem value="100">Top 100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Município</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Ag. Gestor</th>
                <th className="px-3 py-2 text-right">Ag. Empreend.</th>
                <th className="px-3 py-2 text-right">Validados</th>
                <th className="px-3 py-2 text-right">Cancelados</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((m, i) => (
                <tr
                  key={m.municipio}
                  className={i % 2 === 0 ? "bg-[var(--elevated)]" : "bg-[var(--surface)]"}
                >
                  <td className="px-3 py-2 font-medium">{m.municipio}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(m.total)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--danger)]">
                    {formatNumber(m.porBucket.AG_GESTOR ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--warning)]">
                    {formatNumber(m.porBucket.PENDENTE ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--success)]">
                    {formatNumber(m.porBucket.VALIDADO ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)]">
                    {formatNumber(m.porBucket.CANCELADO ?? 0)}
                  </td>
                </tr>
              ))}
              {filtrado.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[var(--text-muted)]">
                    Nenhum município corresponde ao filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </SectionShell>
  );
}

/* ── Seção 5: Diagnóstico ────────────────────────────────────────────────── */

function Diagnostico({
  resumo,
  totalRegistros,
  historico,
}: {
  resumo: CarImportacaoResumo;
  totalRegistros: number;
  historico: Props["historico"];
}) {
  // Necessidade de técnicos: 50 análises/mês por técnico, meta zerar em 12 meses
  const tecnicos = Math.round(resumo.totalPorBucket.AG_GESTOR / 50 / 12);

  const primeiroMes = historico[0];
  const crescimentoTotal =
    primeiroMes && primeiroMes.totalRegistros > 0
      ? ((totalRegistros - primeiroMes.totalRegistros) / primeiroMes.totalRegistros) * 100
      : null;

  const validadosCurrent = resumo.totalPorBucket.VALIDADO;
  const validadosPrev =
    historico.length >= 2
      ? historico[historico.length - 2].resumo.totalPorBucket.VALIDADO
      : null;
  const crescimentoValidados =
    validadosPrev !== null && validadosPrev > 0
      ? ((validadosCurrent - validadosPrev) / validadosPrev) * 100
      : null;

  return (
    <SectionShell
      icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
      title="Diagnóstico"
      subtitle="KPIs acionáveis para a gestão"
    >
      <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
          label="Técnicos necessários"
          value={tecnicos}
          hint="Para zerar o passivo do gestor em 12 meses (50 análises/mês/técnico)"
        />
        <KpiCard
          label="Crescimento total"
          value={crescimentoTotal ?? 0}
          suffix="%"
          decimals={1}
          hint={
            crescimentoTotal !== null
              ? `Desde a 1ª importação (${MESES[primeiroMes.mes - 1]}/${String(primeiroMes.ano).slice(2)})`
              : "Aparece a partir da 2ª importação"
          }
        />
        <KpiCard
          label="Δ Validados m/m"
          value={crescimentoValidados ?? 0}
          suffix="%"
          decimals={1}
          hint={
            crescimentoValidados !== null
              ? "Variação vs. mês anterior"
              : "Aparece a partir da 2ª importação"
          }
        />
        <KpiCard
          label="Fases não classificadas"
          value={resumo.fasesNaoClassificadas.length}
          color={
            resumo.fasesNaoClassificadas.length > 0
              ? BUCKET_COLOR.NAO_CLASSIFICADO
              : undefined
          }
          hint={
            resumo.fasesNaoClassificadas.length > 0
              ? "Reimporte para resolver"
              : "Mapa completo — nenhuma fase pendente"
          }
        />
      </motion.div>
    </SectionShell>
  );
}

/* ── Componentes reutilizáveis ───────────────────────────────────────────── */

function SectionShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={fadeSlideUp} className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-muted)]">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  hint?: string;
  icon?: React.ReactNode;
  color?: string;
  spark?: Array<{ x: number; y: number }>;
}

function KpiCard({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  hint,
  icon,
  color,
  spark,
}: KpiCardProps) {
  return (
    <motion.div
      variants={fadeSlideUp}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      className="rounded-2xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        {icon && (
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--text-muted)]">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        {prefix && <span className="text-lg text-[var(--text-muted)]">{prefix}</span>}
        <span
          className="text-2xl font-semibold tabular-nums tracking-tight"
          style={color ? { color } : undefined}
        >
          {decimals > 0
            ? value.toLocaleString("pt-BR", { maximumFractionDigits: decimals })
            : formatNumber(Math.round(value))}
        </span>
        {suffix && <span className="text-lg text-[var(--text-muted)]">{suffix}</span>}
      </div>
      {hint && (
        <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-subtle)]">{hint}</p>
      )}
      {spark && spark.length >= 2 && (
        <div className="mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color ?? SICAR} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color ?? SICAR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={color ?? SICAR}
                strokeWidth={1.5}
                fill={`url(#grad-${label})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

const tooltipStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: 12,
  fontSize: 12,
} as const;
