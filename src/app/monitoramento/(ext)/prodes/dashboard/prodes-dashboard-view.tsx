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

import { AssinaturaAmbientalCard } from "@/components/monit-ext/assinatura-ambiental";
import { Slide, SlideDeck } from "@/components/monit-ext/slide-deck";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { TEMA_COR } from "@/lib/monit-ext/constants";
import type { IpaMunicipio } from "@/lib/monit-ext/ipa";
import { formatNumber } from "@/lib/utils";

const COR = TEMA_COR.prodes;

interface Ciclo {
  anoProdesRef: number;
  nTotal: number;
  nConcordantes: number;
  nDiscordantes: number;
  nSemProdes: number;
  pctConcordancia: string | null;
  mediaCoberturaPct: string | null;
}
interface Vetor {
  vetor: string;
  nAlertas: number;
  nConcordantes: number;
  pctConcordancia: string;
}
interface Cobertura {
  faixa: string;
  ordem: number;
  nAlertas: number;
  areaHa: string;
}
interface TopMun {
  municipio: string;
  ano: number;
  concordanteHa: string;
  totalHa: string;
  pctConcordancia: string | null;
}

interface Props {
  ciclos: Ciclo[];
  vetores: Vetor[];
  cobertura: Cobertura[];
  topMunicipios: TopMun[];
  ipaRanking: IpaMunicipio[];
  anoAtual: number;
}

const TOC = [
  { id: "visao", label: "Visão geral" },
  { id: "temporal", label: "Evolução temporal" },
  { id: "vetor", label: "Vetor de pressão" },
  { id: "cobertura", label: "Cobertura PRODES" },
  { id: "ranking", label: "Top municípios" },
  { id: "cgeo", label: "Leitura CGEO+" },
];

export function ProdesDashboardView({
  ciclos,
  vetores,
  cobertura,
  topMunicipios,
  ipaRanking,
  anoAtual,
}: Props) {
  const publicados = ciclos.filter((c) => c.pctConcordancia !== null);
  const atual = publicados.at(-1) ?? ciclos.at(-1)!;
  const total = ciclos.reduce((s, c) => s + c.nTotal, 0);
  const conc = ciclos.reduce((s, c) => s + c.nConcordantes, 0);
  const disc = ciclos.reduce((s, c) => s + c.nDiscordantes, 0);
  const sem = ciclos.reduce((s, c) => s + c.nSemProdes, 0);

  return (
    <div className="pb-16">
      <header className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Dashboard PRODES · modo apresentação
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          <span style={{ color: COR }}>PRODES</span> Cerrado{" "}
          <span className="text-[var(--text-muted)]">— {anoAtual}</span>
        </h1>
      </header>

      <SlideDeck backHref="/monitoramento/prodes" toc={TOC} corTema={COR} tituloModulo="PRODES">
        {/* SLIDE 1 — VISÃO GERAL */}
        <Slide
          id="visao"
          index={1}
          total={TOC.length}
          title="Visão geral"
          subtitle="Totalizadores acumulados de validação cruzada nos ciclos publicados."
          corTema={COR}
        >
          <SlideKpiRow atual={atual} totalizadores={{ total, conc, disc, sem }} />
        </Slide>

        {/* SLIDE 2 — EVOLUÇÃO TEMPORAL */}
        <Slide
          id="temporal"
          index={2}
          total={TOC.length}
          title="Evolução temporal"
          subtitle="Concordância e média de cobertura por ciclo."
          corTema={COR}
        >
          <ConcordanciaTempo ciclos={publicados} />
        </Slide>

        {/* SLIDE 3 — VETOR DE PRESSÃO */}
        <Slide
          id="vetor"
          index={3}
          total={TOC.length}
          title="Vetor de pressão"
          subtitle="Onde a pressão de conversão do Cerrado tem origem: agricultura, expansão urbana, mineração..."
          corTema={COR}
        >
          <VetoresChart vetores={vetores} />
        </Slide>

        {/* SLIDE 4 — DISTRIBUIÇÃO DE COBERTURA */}
        <Slide
          id="cobertura"
          index={4}
          total={TOC.length}
          title="Distribuição de cobertura"
          subtitle="Quanto do polígono de alerta é confirmado pelo PRODES. Faixa 0% = não confirmado."
          corTema={COR}
        >
          <CoberturaChart cobertura={cobertura} />
        </Slide>

        {/* SLIDE 5 — TOP MUNICÍPIOS */}
        <Slide
          id="ranking"
          index={5}
          total={TOC.length}
          title="Top municípios validados"
          subtitle="Onde MapBiomas e PRODES mais concordam sobre desmatamento — maior área com dupla confirmação."
          corTema={COR}
          fluid
        >
          <RankingMunicipal top={topMunicipios} />
        </Slide>

        {/* SLIDE 6 — CGEO+ */}
        <Slide
          id="cgeo"
          index={6}
          total={TOC.length}
          title="Leitura CGEO+"
          subtitle="Perfil unificado do município + IPA composto."
          corTema={COR}
          fluid
        >
          <IpaRanking ipa={ipaRanking} anoAtual={anoAtual} />
          <AssinaturaAmbientalCard
            corTema={COR}
            municipios={topMunicipios.slice(0, 8).map((m) => m.municipio)}
          />
        </Slide>
      </SlideDeck>
    </div>
  );
}

function SlideKpiRow({
  atual,
  totalizadores,
}: {
  atual: Ciclo;
  totalizadores: { total: number; conc: number; disc: number; sem: number };
}) {
  const kpis = [
    { label: `Concordância · ${atual.anoProdesRef}`, valor: `${Number(atual.pctConcordancia ?? 0).toFixed(1)}%` },
    { label: "Alertas validados", valor: formatNumber(totalizadores.conc) },
    { label: "Discordantes", valor: formatNumber(totalizadores.disc) },
    { label: "Sem PRODES", valor: formatNumber(totalizadores.sem) },
  ];
  return (
    <motion.div variants={staggerContainer} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <motion.div key={k.label} variants={fadeSlideUp} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">{k.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text)]">{k.valor}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ConcordanciaTempo({ ciclos }: { ciclos: Ciclo[] }) {
  const data = ciclos.map((c) => ({
    ano: c.anoProdesRef,
    concordancia: Number(c.pctConcordancia ?? 0),
    cobertura: Number(c.mediaCoberturaPct ?? 0),
  }));
  return (
    <motion.div variants={fadeSlideUp}>
      <div style={{ width: "100%", height: 260 }}>
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
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]}
            />
            <Line
              type="monotone"
              dataKey="concordancia"
              stroke={COR}
              strokeWidth={2.5}
              name="Concordância"
              dot={{ r: 4, fill: COR, stroke: "var(--elevated)", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="cobertura"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeDasharray="4 4"
              name="Média cobertura"
              dot={{ r: 3, fill: "#94A3B8", stroke: "var(--elevated)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function VetoresChart({ vetores }: { vetores: Vetor[] }) {
  const data = vetores.map((v) => ({ ...v, pct: Number(v.pctConcordancia) }));
  return (
    <motion.div variants={fadeSlideUp}>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <YAxis type="category" dataKey="vetor" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} width={160} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v, name) => name === "nAlertas" ? formatNumber(Number(v)) : `${Number(v).toFixed(1)}%`}
            />
            <Bar dataKey="nAlertas" name="Alertas" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COR} fillOpacity={0.85 - i * 0.06} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function CoberturaChart({ cobertura }: { cobertura: Cobertura[] }) {
  const data = cobertura.map((c) => ({
    faixa: c.faixa,
    alertas: c.nAlertas,
    area: Math.round(Number(c.areaHa)),
  }));
  return (
    <motion.div variants={fadeSlideUp} className="grid gap-4 lg:grid-cols-2">
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="faixa" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v) => [formatNumber(Number(v)), "alertas"]}
            />
            <Bar dataKey="alertas" fill={COR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">Como ler</p>
        <p className="mt-2 leading-relaxed">
          Cada faixa mostra quantos alertas MapBiomas têm um dado percentual de sobreposição
          com polígono PRODES. A faixa <strong>0%</strong> concentra os alertas <em>discordantes</em>
          — MapBiomas detectou mas PRODES não confirmou (falso positivo do MapBiomas ou área
          ainda não visível no ciclo anual PRODES).
        </p>
        <p className="mt-3 leading-relaxed">
          Faixa <strong>90–100%</strong>: dupla confirmação forte. Prioritário para autuação.
        </p>
      </div>
    </motion.div>
  );
}

function RankingMunicipal({ top }: { top: TopMun[] }) {
  return (
    <motion.div variants={fadeSlideUp}>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Município</th>
              <th className="px-4 py-2.5 text-right">Área validada (ha)</th>
              <th className="px-4 py-2.5 text-right">Total detectado (ha)</th>
              <th className="px-4 py-2.5 text-right">Concordância</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {top.map((m, i) => {
              const pct = Number(m.pctConcordancia ?? 0);
              return (
                <tr key={m.municipio} className="text-[13px] hover:bg-[var(--surface)]">
                  <td className="px-4 py-2 text-[var(--text-subtle)] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-2 font-medium text-[var(--text)]">{m.municipio}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                    {formatNumber(Math.round(Number(m.concordanteHa)))}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--text-muted)]">
                    {formatNumber(Math.round(Number(m.totalHa)))}
                  </td>
                  <td
                    className="px-4 py-2 text-right tabular-nums font-semibold"
                    style={{ color: pct >= 85 ? "#10B981" : pct >= 65 ? "#F59E0B" : "#EF4444" }}
                  >
                    {pct.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

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
        divergência PRODES.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ipa.slice(0, 12).map((m, i) => (
          <div key={m.municipio} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <span className="w-6 shrink-0 text-[10px] font-bold tabular-nums text-[var(--text-subtle)]">
              #{String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[var(--text)]">{m.municipio}</div>
              <div className="mt-0.5 flex gap-2 text-[10px] text-[var(--text-subtle)]">
                <span>IPI {m.parcIpi?.toFixed(0) ?? "—"}</span>
                <span>Fogo {m.parcQueimadas?.toFixed(0) ?? "—"}</span>
                <span>ΔPR {m.parcProdes?.toFixed(0) ?? "—"}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold tabular-nums" style={{ color: m.ipa >= 70 ? "#EF4444" : m.ipa >= 50 ? "#F59E0B" : "#10B981" }}>
                {m.ipa.toFixed(0)}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-subtle)]">IPA</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
