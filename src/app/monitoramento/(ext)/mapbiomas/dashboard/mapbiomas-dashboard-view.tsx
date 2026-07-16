"use client";

import { motion } from "framer-motion";
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
import { MESES_LABEL, TEMA_COR } from "@/lib/monit-ext/constants";
import type { IpaMunicipio } from "@/lib/monit-ext/ipa";
import type { MunicipioMapbiomas } from "@/lib/monit-ext/queries";
import { formatNumber } from "@/lib/utils";

const COR = TEMA_COR.mapbiomas;

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
}

const TOC = [
  { id: "visao", label: "Visão executiva" },
  { id: "temporal", label: "Evolução temporal" },
  { id: "municipal", label: "Panorama municipal" },
  { id: "comparativa", label: "Análise comparativa" },
  { id: "cgeo", label: "Leitura CGEO+" },
];

export function MapbiomasDashboardView({
  serie,
  mensal,
  topMunicipios,
  municipiosAtual,
  ipaRanking,
  anoAtual,
}: Props) {
  const atual = serie[serie.length - 1];
  const anterior = serie.length >= 2 ? serie[serie.length - 2] : null;

  return (
    <div className="pb-16">
      <header className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Dashboard MapBiomas · modo apresentação
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Alertas <span style={{ color: COR }}>MapBiomas</span>{" "}
          <span className="text-[var(--text-muted)]">— {anoAtual}</span>
        </h1>
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
          <ClasseComposicao serie={serie} />
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
          <motion.div variants={fadeSlideUp}>
            <MapaChoropleth
              dados={municipiosAtual.map((m) => ({
                municipio: m.municipio,
                valor: Math.round(Number(m.haIrregular)),
              }))}
              cor={COR}
              labelMetrica="Área irregular"
              sufixo="ha"
            />
          </motion.div>
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
        </Slide>

        {/* SLIDE 5 — LEITURA CGEO+ */}
        <Slide
          id="cgeo"
          index={5}
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

function ClasseComposicao({ serie }: { serie: SerieAnualRow[] }) {
  const atual = serie[serie.length - 1];
  const data = [
    { nome: "Irregular", valor: Number(atual.areaIrregularHa), cor: "#EF4444" },
    { nome: "Autorizado", valor: Number(atual.areaAutorizadoHa), cor: "#10B981" },
    { nome: "Autoriz. parcial", valor: Number(atual.areaAutorizadoParcialHa), cor: "#60A5FA" },
    { nome: "Regularizado", valor: Number(atual.areaRegularizadoHa), cor: "#F97316" },
  ].filter((d) => d.valor > 0);
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
          {data.map((d) => (
            <li key={d.nome} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.cor }} />
              <span className="flex-1 text-[var(--text)]">{d.nome}</span>
              <span className="tabular-nums text-[var(--text-muted)]">
                {formatNumber(Math.round(d.valor))} ha
              </span>
              <span className="w-14 text-right text-xs text-[var(--text-subtle)]">
                {((d.valor / total) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="valor"
              nameKey="nome"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={2}
              stroke="var(--elevated)"
            >
              {data.map((d) => (
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
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Queda contínua = avanço do saneamento. Ganhos após inflexão vem em geral do PRA
        (Programa de Regularização Ambiental).
      </p>
      <div className="mt-4" style={{ width: "100%", height: 220 }}>
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
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Área detectada mês a mês em cada ano. Picos em Abril-Maio indicam maior pressão
        de desmatamento após a estação chuvosa.
      </p>
      <div className="mt-4" style={{ width: "100%", height: 240 }}>
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
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Área monitorada por bioma. Cerrado tem baseline maior mas Caatinga vem crescendo.
      </p>
      <div className="mt-4" style={{ width: "100%", height: 220 }}>
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
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Fatiado por precedência instrumental. Verde crescendo é bom; vermelho encolhendo é bom.
      </p>
      <div className="mt-4" style={{ width: "100%", height: 240 }}>
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
