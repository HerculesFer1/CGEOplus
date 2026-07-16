"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

import { Slide, SlideDeck } from "@/components/monit-ext/slide-deck";
import { AssinaturaAmbientalCard } from "@/components/monit-ext/assinatura-ambiental";
import { MapaChoropleth } from "@/components/monit-ext/mapa-choropleth";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { ANO_MIN, MESES_LABEL, TEMA_COR } from "@/lib/monit-ext/constants";
import type { IpaMunicipio } from "@/lib/monit-ext/ipa";
import type { MunicipioMapbiomas } from "@/lib/monit-ext/queries";
import { formatNumber } from "@/lib/utils";

const COR = TEMA_COR.mapbiomas;

/** Escala log para o mapa de área irregular (paleta âmbar tema MapBiomas). */
const MAPBIOMAS_ESCALA_LOG = [
  { limite: 0, cor: "#F5F5F5" },
  { limite: 1, cor: "#FEE8C8" },
  { limite: 100, cor: "#FDD49E" },
  { limite: 500, cor: "#FDBB84" },
  { limite: 2000, cor: "#FC8D59" },
  { limite: 10000, cor: "#B45309" },
];

/** Nota de contexto — igual à do Queimadas (visual consistente entre módulos). */
function NotaContexto({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
      <span
        className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current text-[9px] font-bold"
        aria-hidden
      >
        i
      </span>
      <span>{children}</span>
    </p>
  );
}

interface SerieAnualRow {
  ano: number;
  nAlertas: number;
  areaTotalHa: string;
  areaIrregularHa: string;
  areaAutorizadoHa: string;
  areaAutorizadoParcialHa: string;
  areaRegularizadoHa: string;
  cerradoHa: string;
  caatingaHa: string;
  ipiPct: string;
}

interface Props {
  serie: SerieAnualRow[];
  mensal: Array<{ ano: number; mes: number; areaHa: string; nAlertas: number }>;
  topMunicipios: MunicipioMapbiomas[];
  municipiosAtual: MunicipioMapbiomas[];
  ipaRanking: IpaMunicipio[];
  anoAtual: number;
  anosDisponiveis: number[];
  anoParcial: boolean;
}

const TOC = [
  { id: "visao", label: "Visão executiva" },
  { id: "temporal", label: "Evolução temporal" },
  { id: "municipal", label: "Panorama municipal" },
  { id: "comparativa", label: "Análise comparativa" },
  { id: "base2022", label: `Comparativo desde ${ANO_MIN}` },
  { id: "cgeo", label: "Leitura CGEO+" },
];

export function MapbiomasDashboardView({
  serie,
  mensal,
  topMunicipios,
  municipiosAtual,
  ipaRanking,
  anoAtual,
  anosDisponiveis,
  anoParcial,
}: Props) {
  // "atual" segue o ano SELECIONADO no seletor, não o último da série.
  const atual = serie.find((s) => s.ano === anoAtual) ?? serie[serie.length - 1];
  const atualIdx = serie.findIndex((s) => s.ano === anoAtual);
  const anterior = atualIdx > 0 ? serie[atualIdx - 1] : null;
  // Ano-base para o comparativo — 2022 (marco temporal do projeto REDD+).
  const base = serie.find((s) => s.ano === ANO_MIN) ?? serie[0];

  return (
    <div className="pb-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Dashboard MapBiomas · modo apresentação
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Alertas <span style={{ color: COR }}>MapBiomas</span>{" "}
            <span className="text-[var(--text-muted)]">— {anoAtual}</span>
          </h1>
          {anoParcial && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-500">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              Ano corrente — dados parciais até o próximo sync mensal
            </p>
          )}
        </div>
        <AnoSeletor anos={anosDisponiveis} anoAtual={anoAtual} />
      </header>

      <SlideDeck
        backHref="/monitoramento/mapbiomas"
        toc={TOC}
        corTema={COR}
        tituloModulo="MapBiomas"
      >
        {/* SLIDE 1 — VISÃO EXECUTIVA */}
        <Slide
          id="visao"
          index={1}
          total={TOC.length}
          title="Visão executiva"
          subtitle="Panorama do último ciclo publicado. KPIs de decisão + composição por classe fundiária-ambiental."
          corTema={COR}
        >
          <SlideKpiRow atual={atual} anterior={anterior} />
          <ClasseComposicao serie={serie} ano={anoAtual} />
          <NotaContexto>
            <strong>Composição fundiária</strong> — Irregular = residual sem
            ASV nem DERADSA. Autorizado Pleno = ASV cobre ≥ 99% do polígono.
            Autoriz. Parcial = ASV cobre parte do polígono (o restante segue
            irregular). Regularizado = DERADSA aplicada no residual. Em
            2022-2023 a categoria &quot;Regularizado&quot; aparece como &quot;— sem
            DERADSA&quot; porque a fonte ainda não estava disponível.
          </NotaContexto>
        </Slide>

        {/* SLIDE 2 — EVOLUÇÃO TEMPORAL */}
        <Slide
          id="temporal"
          index={2}
          total={TOC.length}
          title="Evolução temporal"
          subtitle="Tendência anual do IPI e sazonalidade mensal da área monitorada."
          corTema={COR}
        >
          <IpiTendencia serie={serie} />
          <SazonalidadeMensal mensal={mensal} />
        </Slide>

        {/* SLIDE 3 — PANORAMA MUNICIPAL */}
        <Slide
          id="municipal"
          index={3}
          total={TOC.length}
          title="Panorama municipal"
          subtitle={`Área irregular por município em ${anoAtual}. Concentração espacial do problema.`}
          corTema={COR}
          fluid
        >
          <MapaMunicipalMapbiomas municipiosAtual={municipiosAtual} anoAtual={anoAtual} />
          <NotaContexto>
            Escala log de área irregular — municípios sem alerta ficam em cinza
            claro. Faixas: 1-100 · 100-500 · 500-2k · 2k-10k · &gt;10k ha.
            Clique num município para abrir o cartão de contexto com bioma
            dominante, % irregular e reincidência.
          </NotaContexto>
          <RankingMunicipal top={topMunicipios} totalMunicipios={municipiosAtual.length} />
        </Slide>

        {/* SLIDE 4 — ANÁLISE COMPARATIVA */}
        <Slide
          id="comparativa"
          index={4}
          total={TOC.length}
          title="Análise comparativa"
          subtitle="Cruzamento entre biomas (Cerrado × Caatinga) e distribuição do desmatamento em 4 classes fundiárias."
          corTema={COR}
        >
          <BiomaComparativo serie={serie} />
          <QuatroClassesPorAno serie={serie} />
          <NotaContexto>
            <strong>Precedência da classificação</strong> — Autorizado (ASV
            cobre ≥ 99% do polígono) → Autorizado Parcialmente (ASV cobre
            parte) → Regularizado (DERADSA aplicada no residual) → Irregular
            (residual sem cobertura). Anos 2022-2023 não tinham DERADSA
            disponível, por isso &quot;Regularizado&quot; = 0.
          </NotaContexto>
        </Slide>

        {/* SLIDE 5 — COMPARATIVO ANO A ANO DESDE 2022 (ano-base REDD+) */}
        <Slide
          id="base2022"
          index={5}
          total={TOC.length}
          title={`Comparativo desde ${ANO_MIN}`}
          subtitle={`${ANO_MIN} é o marco temporal do projeto REDD+ Piauí. Cada linha compara o ano com o ano-base.`}
          corTema={COR}
        >
          <ComparativoBase base={base} serie={serie} />
          <NotaContexto>
            Deltas em <strong>hectares</strong> (área) e <strong>pontos
            percentuais</strong> (IPI). Verde = redução; vermelho = piora.
            Para IPI cair é bom (menos irregular); para nº alertas depende do
            contexto — pode ser mais monitoramento ou mais pressão.
          </NotaContexto>
        </Slide>

        {/* SLIDE 6 — LEITURA CGEO+ */}
        <Slide
          id="cgeo"
          index={6}
          total={TOC.length}
          title="Leitura CGEO+"
          subtitle="Camada institucional do CGEO+ — perfil unificado do município e ranking pelo IPA composto."
          corTema={COR}
          fluid
        >
          <IpaRanking ipa={ipaRanking} anoAtual={anoAtual} />
          <AssinaturaAmbientalCard corTema={COR} municipios={topMunicipios.slice(0, 8).map((m) => m.municipio)} />
        </Slide>
      </SlideDeck>
    </div>
  );
}

/* ==========================================================================
   Seletor de ano + Mapa municipal + Comparativo base 2022
   ========================================================================== */

function AnoSeletor({ anos, anoAtual }: { anos: number[]; anoAtual: number }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border bg-[var(--surface)] p-1">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
        Ano
      </span>
      {anos.map((a) => (
        <button
          key={a}
          onClick={() => router.push(`?ano=${a}`, { scroll: false })}
          className={`rounded-full px-3 py-1 text-[12px] font-medium tabular-nums transition-colors ${
            a === anoAtual
              ? "bg-[var(--elevated)] text-[var(--text)] shadow-[var(--shadow-sm)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
          style={a === anoAtual ? { color: COR } : undefined}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

function MapaMunicipalMapbiomas({
  municipiosAtual,
  anoAtual,
}: {
  municipiosAtual: MunicipioMapbiomas[];
  anoAtual: number;
}) {
  const [selecionado, setSelecionado] = useState<MunicipioMapbiomas | null>(null);
  return (
    <motion.div variants={fadeSlideUp} className="relative">
      <MapaChoropleth
        dados={municipiosAtual.map((m) => ({
          municipio: m.municipio,
          valor: Math.round(Number(m.haIrregular)),
        }))}
        cor={COR}
        labelMetrica="Área irregular"
        sufixo="ha"
        escalaLog={MAPBIOMAS_ESCALA_LOG}
        onSelect={(nome) => {
          const m = municipiosAtual.find(
            (mm) => mm.municipio.toLowerCase() === nome.toLowerCase(),
          );
          if (m) setSelecionado(m);
        }}
      />
      {selecionado && (
        <div className="pointer-events-auto absolute right-4 top-4 z-20 w-64 max-w-[calc(100%-2rem)] rounded-2xl border bg-[var(--elevated)]/95 p-4 shadow-[var(--shadow-md)] backdrop-blur-md">
          <MapbiomasMunicipioCard
            municipio={selecionado}
            anoAtual={anoAtual}
            onClose={() => setSelecionado(null)}
          />
        </div>
      )}
    </motion.div>
  );
}

function MapbiomasMunicipioCard({
  municipio,
  anoAtual,
  onClose,
}: {
  municipio: MunicipioMapbiomas;
  anoAtual: number;
  onClose: () => void;
}) {
  const pct = Number(municipio.pctIrregular ?? 0);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Município · {anoAtual}
          </p>
          <h4 className="truncate text-base font-semibold text-[var(--text)]" title={municipio.municipio}>
            {municipio.municipio}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-subtle)] hover:text-[var(--text)]"
          aria-label="Fechar cartão"
        >
          ×
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">Área total</dt>
          <dd className="font-semibold tabular-nums text-[var(--text)]">
            {formatNumber(Math.round(Number(municipio.haTotal)))} ha
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">Irregular</dt>
          <dd
            className="font-semibold tabular-nums"
            style={{ color: pct >= 70 ? "#EF4444" : pct >= 40 ? "#F59E0B" : "var(--text)" }}
          >
            {formatNumber(Math.round(Number(municipio.haIrregular)))} ha
          </dd>
        </div>
        <div className="col-span-2 rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">% irregular</dt>
          <dd
            className="font-semibold tabular-nums"
            style={{ color: pct >= 70 ? "#EF4444" : pct >= 40 ? "#F59E0B" : "var(--text)" }}
          >
            {pct.toFixed(1)}%
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">Bioma</dt>
          <dd className="font-semibold text-[var(--text)]">{municipio.bioma ?? "—"}</dd>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">Vetor</dt>
          <dd className="truncate font-semibold text-[var(--text)]" title={municipio.vpressaoDominante ?? undefined}>
            {municipio.vpressaoDominante ?? "—"}
          </dd>
        </div>
      </dl>
      {municipio.reincidente && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-[11px] font-medium text-red-500">
          Reincidente — alerta irregular em{" "}
          {municipio.anosComAlertaIrregular?.length ?? 0} anos.
        </div>
      )}
    </div>
  );
}

function ComparativoBase({
  base,
  serie,
}: {
  base: SerieAnualRow;
  serie: SerieAnualRow[];
}) {
  const linhas = useMemo(
    () =>
      serie
        .filter((s) => s.ano >= base.ano)
        .map((s) => {
          const deltaArea = Number(s.areaIrregularHa) - Number(base.areaIrregularHa);
          const deltaIpi = Number(s.ipiPct) - Number(base.ipiPct);
          const deltaAlertas = s.nAlertas - base.nAlertas;
          return { s, deltaArea, deltaIpi, deltaAlertas };
        }),
    [base, serie],
  );
  return (
    <motion.div variants={fadeSlideUp} className="overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          <tr>
            <th className="px-4 py-2.5">Ano</th>
            <th className="px-4 py-2.5 text-right">Alertas</th>
            <th className="px-4 py-2.5 text-right">Δ vs {base.ano}</th>
            <th className="px-4 py-2.5 text-right">Área irreg. (ha)</th>
            <th className="px-4 py-2.5 text-right">Δ vs {base.ano}</th>
            <th className="px-4 py-2.5 text-right">IPI</th>
            <th className="px-4 py-2.5 text-right">Δ vs {base.ano}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {linhas.map(({ s, deltaArea, deltaIpi, deltaAlertas }) => {
            const isBase = s.ano === base.ano;
            return (
              <tr
                key={s.ano}
                className={`text-[13px] ${isBase ? "bg-[var(--surface)]/60" : ""}`}
              >
                <td className="px-4 py-2 font-medium text-[var(--text)]">
                  {s.ano}
                  {isBase && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-500">
                      base
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {formatNumber(s.nAlertas)}
                </td>
                <td className="px-4 py-2 text-right">
                  {isBase ? "—" : <DeltaChip value={deltaAlertas} bomSeNegativo />}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {formatNumber(Math.round(Number(s.areaIrregularHa)))}
                </td>
                <td className="px-4 py-2 text-right">
                  {isBase ? "—" : <DeltaChip value={Math.round(deltaArea)} bomSeNegativo sufixo=" ha" />}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {Number(s.ipiPct).toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-right">
                  {isBase ? "—" : <DeltaChip value={Number(deltaIpi.toFixed(1))} bomSeNegativo sufixo="pp" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

function DeltaChip({
  value,
  bomSeNegativo,
  sufixo = "",
}: {
  value: number;
  bomSeNegativo?: boolean;
  sufixo?: string;
}) {
  if (value === 0) return <span className="text-[var(--text-subtle)]">±0{sufixo}</span>;
  const positivo = value > 0;
  const bom = bomSeNegativo ? !positivo : positivo;
  const cor = bom ? "#10B981" : "#EF4444";
  const Icon = positivo ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums"
      style={{ backgroundColor: `${cor}15`, color: cor }}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {positivo ? "+" : ""}
      {typeof value === "number" && Number.isInteger(value) ? formatNumber(value) : value.toFixed(1)}
      {sufixo}
    </span>
  );
}

/* ==========================================================================
   BLOCOS DO SLIDE 1
   ========================================================================== */

function SlideKpiRow({ atual, anterior }: { atual: SerieAnualRow; anterior: SerieAnualRow | null }) {
  const ipi = Number(atual.ipiPct);
  const ipiAnt = anterior ? Number(anterior.ipiPct) : null;
  const deltaIpi = ipiAnt !== null ? Number((ipi - ipiAnt).toFixed(1)) : null;

  const kpis = [
    { label: "Alertas", valor: formatNumber(atual.nAlertas) },
    { label: "Área total (ha)", valor: formatNumber(Math.round(Number(atual.areaTotalHa))) },
    { label: "Área irregular (ha)", valor: formatNumber(Math.round(Number(atual.areaIrregularHa))) },
    { label: "IPI", valor: `${ipi.toFixed(1)}%`, delta: deltaIpi === null ? null : `${deltaIpi > 0 ? "+" : ""}${deltaIpi}pp` },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((k) => (
        <motion.div
          key={k.label}
          variants={fadeSlideUp}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            {k.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">
            {k.valor}
          </p>
          {"delta" in k && k.delta && (
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{k.delta}</p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

function ClasseComposicao({ serie, ano }: { serie: SerieAnualRow[]; ano: number }) {
  const atual = serie.find((s) => s.ano === ano) ?? serie[serie.length - 1];
  // Mantém as 4 categorias mesmo quando zero — assim vemos "— sem DERADSA"
  // para anos 2022-2023 sem inventar categoria inexistente.
  const data = [
    { nome: "Irregular", valor: Number(atual.areaIrregularHa), cor: "#EF4444" },
    { nome: "Autorizado", valor: Number(atual.areaAutorizadoHa), cor: "#10B981" },
    { nome: "Autoriz. parcial", valor: Number(atual.areaAutorizadoParcialHa), cor: "#60A5FA" },
    { nome: "Regularizado", valor: Number(atual.areaRegularizadoHa), cor: "#F97316" },
  ];
  const dataChart = data.filter((d) => d.valor > 0);
  const total = data.reduce((s, d) => s + d.valor, 0);

  return (
    <motion.div variants={fadeSlideUp} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <h4 className="text-sm font-semibold text-[var(--text)]">
          Composição fundiária em {atual.ano}
        </h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Distribuição da área desmatada por classe de instrumento. A precedência é
          ASV → DERADSA → IRREGULAR.
        </p>
        <ul className="mt-4 space-y-1.5">
          {data.map((d) => {
            const semDado = d.valor === 0;
            const legendaSemDado =
              d.nome === "Regularizado" && semDado
                ? "— sem DERADSA"
                : semDado
                  ? "—"
                  : `${formatNumber(Math.round(d.valor))} ha`;
            return (
              <li key={d.nome} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.cor, opacity: semDado ? 0.35 : 1 }}
                />
                <span
                  className="flex-1"
                  style={{ color: semDado ? "var(--text-subtle)" : "var(--text)" }}
                >
                  {d.nome}
                </span>
                <span
                  className="tabular-nums"
                  style={{ color: semDado ? "var(--text-subtle)" : "var(--text-muted)" }}
                >
                  {legendaSemDado}
                </span>
                <span className="w-14 text-right text-xs text-[var(--text-subtle)]">
                  {total > 0 && !semDado ? `${((d.valor / total) * 100).toFixed(1)}%` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={dataChart}
              dataKey="valor"
              nameKey="nome"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={2}
              stroke="var(--elevated)"
            >
              {dataChart.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${formatNumber(Math.round(Number(v)))} ha`, "área"]}
              contentStyle={{
                backgroundColor: "var(--elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   BLOCOS DO SLIDE 2 (temporal)
   ========================================================================== */

function IpiTendencia({ serie }: { serie: SerieAnualRow[] }) {
  const data = serie.map((s) => ({ ano: s.ano, ipi: Number(s.ipiPct) }));
  return (
    <motion.div variants={fadeSlideUp}>
      <h4 className="text-sm font-semibold text-[var(--text)]">IPI ao longo dos anos</h4>
      <div className="mt-3" style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              formatter={(v) => [`${v}%`, "IPI"]}
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="ipi"
              stroke={COR}
              strokeWidth={2.5}
              dot={{ r: 4, fill: COR, stroke: "var(--elevated)", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <NotaContexto>
        Queda contínua = avanço do saneamento fundiário-ambiental. Ganhos
        após inflexão vêm em geral do PRA (Programa de Regularização
        Ambiental) — regularização retroativa de área irregular.
      </NotaContexto>
    </motion.div>
  );
}

function SazonalidadeMensal({ mensal }: { mensal: Props["mensal"] }) {
  const anos = Array.from(new Set(mensal.map((m) => m.ano))).sort();
  const data = MESES_LABEL.map((label, i) => {
    const mes = i + 1;
    const linha: Record<string, number | string> = { mes: label };
    for (const ano of anos) {
      const found = mensal.find((m) => m.ano === ano && m.mes === mes);
      linha[String(ano)] = found ? Math.round(Number(found.areaHa)) : 0;
    }
    return linha;
  });

  const cores = ["#FEC260", "#F5A623", "#F59E0B", "#B45309"];

  return (
    <motion.div variants={fadeSlideUp}>
      <h4 className="text-sm font-semibold text-[var(--text)]">Sazonalidade mensal</h4>
      <div className="mt-3" style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {anos.map((ano, i) => (
                <linearGradient key={ano} id={`fill-mb-${ano}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cores[i % cores.length]} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={cores[i % cores.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="var(--text-subtle)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip
              formatter={(v) => `${formatNumber(Math.round(Number(v)))} ha`}
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {anos.map((ano, i) => (
              <Area
                key={ano}
                type="monotone"
                dataKey={String(ano)}
                stroke={cores[i % cores.length]}
                fill={`url(#fill-mb-${ano})`}
                strokeWidth={1.75}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <NotaContexto>
        Área detectada mês a mês em cada ano. Picos em Abril-Maio indicam
        maior pressão de desmatamento logo após a estação chuvosa —
        vegetação seca facilita a detecção de mudança pelo satélite.
      </NotaContexto>
    </motion.div>
  );
}

/* ==========================================================================
   BLOCOS DO SLIDE 3 (municipal)
   ========================================================================== */

function RankingMunicipal({
  top,
  totalMunicipios,
}: {
  top: MunicipioMapbiomas[];
  totalMunicipios: number;
}) {
  return (
    <motion.div variants={fadeSlideUp}>
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-[var(--text)]">
          Ranking · maior área irregular
        </h4>
        <p className="text-[11px] text-[var(--text-subtle)]">
          {formatNumber(totalMunicipios)} municípios monitorados neste ano
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Município</th>
              <th className="px-4 py-2.5">Bioma</th>
              <th className="px-4 py-2.5 text-right">Área irregular (ha)</th>
              <th className="px-4 py-2.5 text-right">% irregular</th>
              <th className="px-4 py-2.5 text-right">Reincidência</th>
              <th className="px-4 py-2.5">Vetor dominante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {top.map((m, i) => (
              <tr key={m.municipio} className="text-[13px] hover:bg-[var(--surface)]">
                <td className="px-4 py-2 text-[var(--text-subtle)] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-4 py-2 font-medium text-[var(--text)]">{m.municipio}</td>
                <td className="px-4 py-2 text-[var(--text-muted)]">{m.bioma ?? "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {formatNumber(Math.round(Number(m.haIrregular)))}
                </td>
                <td className="px-4 py-2 text-right tabular-nums" style={{ color: Number(m.pctIrregular) >= 70 ? "#EF4444" : Number(m.pctIrregular) >= 40 ? "#F59E0B" : "var(--text-muted)" }}>
                  {Number(m.pctIrregular).toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-right text-[11px]">
                  {m.reincidente ? (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-400">
                      {m.anosComAlertaIrregular?.length ?? 0} anos
                    </span>
                  ) : (
                    <span className="text-[var(--text-subtle)]">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-[var(--text-muted)]">
                  {m.vpressaoDominante ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   BLOCOS DO SLIDE 4 (comparativa)
   ========================================================================== */

function BiomaComparativo({ serie }: { serie: SerieAnualRow[] }) {
  const data = serie.map((s) => ({
    ano: s.ano,
    cerrado: Math.round(Number(s.cerradoHa)),
    caatinga: Math.round(Number(s.caatingaHa)),
  }));

  return (
    <motion.div variants={fadeSlideUp}>
      <h4 className="text-sm font-semibold text-[var(--text)]">Bioma × ano</h4>
      <div className="mt-3" style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ano" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              formatter={(v) => `${formatNumber(Number(v))} ha`}
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="cerrado" fill="#B45309" name="Cerrado" radius={[4, 4, 0, 0]} />
            <Bar dataKey="caatinga" fill="#D97706" name="Caatinga" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <NotaContexto>
        Área monitorada por bioma no Piauí. Cerrado tem baseline maior
        (região sul do estado — MATOPIBA), mas Caatinga vem ganhando
        participação a cada ano.
      </NotaContexto>
    </motion.div>
  );
}

function QuatroClassesPorAno({ serie }: { serie: SerieAnualRow[] }) {
  const data = serie.map((s) => ({
    ano: s.ano,
    Irregular: Math.round(Number(s.areaIrregularHa)),
    Autorizado: Math.round(Number(s.areaAutorizadoHa)),
    "Autoriz. parcial": Math.round(Number(s.areaAutorizadoParcialHa)),
    Regularizado: Math.round(Number(s.areaRegularizadoHa)),
  }));

  const cores: Record<string, string> = {
    Irregular: "#EF4444",
    Autorizado: "#10B981",
    "Autoriz. parcial": "#60A5FA",
    Regularizado: "#F97316",
  };

  return (
    <motion.div variants={fadeSlideUp}>
      <h4 className="text-sm font-semibold text-[var(--text)]">
        4 classes de situação fundiária × ano
      </h4>
      <div className="mt-3" style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ano" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              formatter={(v) => `${formatNumber(Number(v))} ha`}
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {Object.entries(cores).map(([nome, cor]) => (
              <Bar key={nome} dataKey={nome} stackId="c" fill={cor} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <NotaContexto>
        Fatiado por precedência instrumental (ASV → DERADSA → residual).
        Verde crescendo é bom (mais área com licença plena); vermelho
        encolhendo é bom (menos área irregular). O aumento do laranja em
        2024-2025 mostra a chegada da DERADSA na base.
      </NotaContexto>
    </motion.div>
  );
}

/* ==========================================================================
   BLOCOS DO SLIDE 5 (CGEO+)
   ========================================================================== */

function IpaRanking({ ipa, anoAtual }: { ipa: IpaMunicipio[]; anoAtual: number }) {
  return (
    <motion.div variants={fadeSlideUp}>
      <div className="mb-2 flex items-baseline gap-2">
        <h4 className="text-sm font-semibold text-[var(--text)]">
          IPA · Índice de Pressão Ambiental composto
        </h4>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-subtle)]">
          {anoAtual} · leitura CGEO+
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Score 0-100 combinando 50% IPI + 30% queimadas em áreas prioritárias + 20%
        divergência PRODES. Renormaliza pesos quando faltar cobertura em alguma fonte.
        <span className="ml-1 rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px]">
          não substitui métricas individuais
        </span>
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ipa.slice(0, 15).map((m, i) => (
          <div
            key={m.municipio}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <span className="w-6 shrink-0 text-[10px] font-bold tabular-nums text-[var(--text-subtle)]">
              #{String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[var(--text)]">
                {m.municipio}
              </div>
              <div className="mt-0.5 flex gap-2 text-[10px] text-[var(--text-subtle)]">
                <span>IPI {m.parcIpi?.toFixed(0) ?? "—"}</span>
                <span>Fogo {m.parcQueimadas?.toFixed(0) ?? "—"}</span>
                <span>ΔPR {m.parcProdes?.toFixed(0) ?? "—"}</span>
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-lg font-semibold tabular-nums"
                style={{ color: colorIpa(m.ipa) }}
              >
                {m.ipa.toFixed(0)}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-subtle)]">
                IPA
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function colorIpa(score: number): string {
  if (score >= 70) return "#EF4444";
  if (score >= 50) return "#F59E0B";
  if (score >= 30) return "#F5A623";
  return "#10B981";
}
