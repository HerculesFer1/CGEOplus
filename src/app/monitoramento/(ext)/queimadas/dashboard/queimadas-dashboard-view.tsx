"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AssinaturaAmbientalCard } from "@/components/monit-ext/assinatura-ambiental";
import { Slide, SlideDeck } from "@/components/monit-ext/slide-deck";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { MESES_LABEL, TEMA_COR } from "@/lib/monit-ext/constants";
import type { IpaMunicipio } from "@/lib/monit-ext/ipa";
import { formatNumber } from "@/lib/utils";

const COR = TEMA_COR.queimadas;
/** Paleta AHP 1..5 alinhada ao dashboard upstream (FEC260 → B30000). */
const CORES_AHP = ["#FEC260", "#FDBB84", "#FC8D59", "#E34A33", "#B30000"] as const;
const LABEL_AHP: Record<number, string> = {
  1: "Muito Baixo",
  2: "Baixo",
  3: "Médio",
  4: "Alto",
  5: "Muito Alto",
};

interface SerieAno {
  ano: number;
  areaQueimadaHa: string;
  nCicatrizes: number;
  nMunicipiosAfetados: number;
}
interface MunicipioAno {
  municipioCod: string;
  municipioNome: string;
  ano: number;
  areaQueimadaTotalHa: string;
  nCicatrizesTotal: number;
  classeMaxQueimada: number | null;
  pctAreaPrioritaria: string | null;
  mesPico: number | null;
  emAlerta: boolean | null;
}
interface SazonalidadeRow {
  mes: number;
  classePrioridade: number;
  areaHa: string;
  nCicatrizes: number;
}
interface Recorrente {
  municipioCod: string;
  municipioNome: string;
  anosCriticos: number;
  totalAnos: number;
  areaTotalHa: string;
}

interface Props {
  serie: SerieAno[];
  topMunicipios: MunicipioAno[];
  emAlerta: MunicipioAno[];
  sazonalidade: SazonalidadeRow[];
  recorrentes: Recorrente[];
  ipaRanking: IpaMunicipio[];
  anoAtual: number;
}

const TOC = [
  { id: "visao", label: "Visão geral" },
  { id: "classes", label: "Por classe AHP" },
  { id: "municipal", label: "Panorama municipal" },
  { id: "mensal", label: "Evolução mensal" },
  { id: "anual", label: "Série anual" },
  { id: "recorrencia", label: "Recorrência" },
  { id: "cgeo", label: "Leitura CGEO+" },
];

export function QueimadasDashboardView({
  serie,
  topMunicipios,
  emAlerta,
  sazonalidade,
  recorrentes,
  ipaRanking,
  anoAtual,
}: Props) {
  const atual = serie.at(-1)!;
  const areaAtual = Number(atual.areaQueimadaHa);
  const areaEmAlerta = emAlerta.reduce(
    (s, m) => s + Number(m.areaQueimadaTotalHa),
    0,
  );

  return (
    <div className="pb-16">
      <header className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          Dashboard Queimadas · modo apresentação
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          <span style={{ color: COR }}>Queimadas</span> INPE{" "}
          <span className="text-[var(--text-muted)]">— {anoAtual}</span>
        </h1>
      </header>

      <SlideDeck backHref="/monitoramento/queimadas" toc={TOC} corTema={COR} tituloModulo="Queimadas">
        {/* SLIDE 1 — VISÃO GERAL */}
        <Slide
          id="visao"
          index={1}
          total={TOC.length}
          title="Visão geral"
          subtitle="Panorama estadual + destaque de municípios em pressão crítica."
          corTema={COR}
        >
          <SlideKpiRow
            atual={atual}
            emAlertaCount={emAlerta.length}
            areaEmAlerta={areaEmAlerta}
            areaAtual={areaAtual}
          />
          <AlertaBanner emAlerta={emAlerta} anoAtual={anoAtual} />
        </Slide>

        {/* SLIDE 2 — POR CLASSE AHP */}
        <Slide
          id="classes"
          index={2}
          total={TOC.length}
          title="Por classe AHP"
          subtitle="Distribuição da área queimada pelas 5 classes de prioridade ambiental (AHP)."
          corTema={COR}
        >
          <ClassesDist sazonalidade={sazonalidade} />
        </Slide>

        {/* SLIDE 3 — MUNICIPAL */}
        <Slide
          id="municipal"
          index={3}
          total={TOC.length}
          title="Panorama municipal"
          subtitle={`Top 20 municípios em ${anoAtual}. Marcados em vermelho: em alerta CGEO+ (AHP 4-5 + >50% prioritária).`}
          corTema={COR}
          fluid
        >
          <RankingMunicipal top={topMunicipios} />
        </Slide>

        {/* SLIDE 4 — EVOLUÇÃO MENSAL */}
        <Slide
          id="mensal"
          index={4}
          total={TOC.length}
          title="Evolução mensal por classe"
          subtitle="Área queimada mês a mês em cada classe AHP. Sazonalidade seca (Ago-Out) é onde a pressão concentra."
          corTema={COR}
        >
          <MensalPorClasse sazonalidade={sazonalidade} />
        </Slide>

        {/* SLIDE 5 — SÉRIE ANUAL */}
        <Slide
          id="anual"
          index={5}
          total={TOC.length}
          title="Série anual do Piauí"
          subtitle="Área queimada e nº de cicatrizes ao longo dos anos."
          corTema={COR}
        >
          <SerieAnual serie={serie} />
        </Slide>

        {/* SLIDE 6 — RECORRÊNCIA */}
        <Slide
          id="recorrencia"
          index={6}
          total={TOC.length}
          title="Recorrência"
          subtitle="Municípios com pressão crítica em ≥ 2 anos. Alvo prioritário para políticas contínuas."
          corTema={COR}
          fluid
        >
          <Recorrencia recorrentes={recorrentes} />
        </Slide>

        {/* SLIDE 7 — CGEO+ */}
        <Slide
          id="cgeo"
          index={7}
          total={TOC.length}
          title="Leitura CGEO+"
          subtitle="Perfil unificado do município + IPA composto."
          corTema={COR}
          fluid
        >
          <IpaRanking ipa={ipaRanking} anoAtual={anoAtual} />
          <AssinaturaAmbientalCard
            corTema={COR}
            municipios={emAlerta.slice(0, 8).map((m) => m.municipioNome)}
          />
        </Slide>
      </SlideDeck>
    </div>
  );
}

/* ==========================================================================
   SLIDE 1
   ========================================================================== */

function SlideKpiRow({
  atual,
  emAlertaCount,
  areaEmAlerta,
  areaAtual,
}: {
  atual: SerieAno;
  emAlertaCount: number;
  areaEmAlerta: number;
  areaAtual: number;
}) {
  const pctEmAlerta = areaAtual > 0 ? (areaEmAlerta / areaAtual) * 100 : 0;
  const kpis = [
    { label: "Área queimada (ha)", valor: formatNumber(Math.round(areaAtual)) },
    { label: "Cicatrizes detectadas", valor: formatNumber(atual.nCicatrizes) },
    { label: "Municípios afetados", valor: `${atual.nMunicipiosAfetados}/224` },
    {
      label: "Em alerta CGEO+",
      valor: `${emAlertaCount}`,
      sub: `${pctEmAlerta.toFixed(1)}% da área queimada`,
      destaque: true,
    },
  ];
  return (
    <motion.div variants={staggerContainer} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <motion.div
          key={k.label}
          variants={fadeSlideUp}
          className="rounded-2xl border p-4"
          style={{
            backgroundColor: k.destaque ? "rgba(239,68,68,0.08)" : "var(--surface)",
            borderColor: k.destaque ? "rgba(239,68,68,0.3)" : "var(--border)",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            {k.label}
          </p>
          <p
            className="mt-1 text-2xl font-semibold tabular-nums"
            style={{ color: k.destaque ? "#EF4444" : "var(--text)" }}
          >
            {k.valor}
          </p>
          {"sub" in k && k.sub && (
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{k.sub}</p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

function AlertaBanner({ emAlerta, anoAtual }: { emAlerta: MunicipioAno[]; anoAtual: number }) {
  if (emAlerta.length === 0) return null;
  return (
    <motion.div
      variants={fadeSlideUp}
      className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
          <AlertTriangle className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">
            {emAlerta.length} municípios em pressão crítica em {anoAtual}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Critério: classe AHP máxima 4 ou 5 combinada com &gt;50% da área queimada em zona prioritária.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {emAlerta.slice(0, 20).map((m) => (
              <span
                key={m.municipioCod}
                className="rounded-full border border-red-500/25 bg-[var(--elevated)] px-2 py-0.5 text-[10.5px] text-[var(--text)]"
              >
                {m.municipioNome}
              </span>
            ))}
            {emAlerta.length > 20 && (
              <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10.5px] text-[var(--text-muted)]">
                +{emAlerta.length - 20}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   SLIDE 2 — Classes
   ========================================================================== */

function ClassesDist({ sazonalidade }: { sazonalidade: SazonalidadeRow[] }) {
  const porClasse = new Map<number, number>();
  for (const r of sazonalidade) {
    const acc = porClasse.get(r.classePrioridade) ?? 0;
    porClasse.set(r.classePrioridade, acc + Number(r.areaHa));
  }
  const data = [1, 2, 3, 4, 5].map((c) => ({
    classe: LABEL_AHP[c],
    area: Math.round(porClasse.get(c) ?? 0),
    cor: CORES_AHP[c - 1],
    critica: c >= 4,
  }));
  const total = data.reduce((s, d) => s + d.area, 0);

  return (
    <motion.div variants={fadeSlideUp} className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="classe" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v) => `${formatNumber(Number(v))} ha`}
            />
            <Bar dataKey="area" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li
            key={d.classe}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.cor }} />
              <span className="text-[13px] text-[var(--text)]">{d.classe}</span>
              {d.critica && (
                <span className="rounded bg-red-500/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-red-400">
                  crítica
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[13px] font-semibold tabular-nums text-[var(--text)]">
                {formatNumber(d.area)} ha
              </p>
              <p className="text-[10px] text-[var(--text-subtle)]">
                {total > 0 ? ((d.area / total) * 100).toFixed(1) : "0.0"}%
              </p>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ==========================================================================
   SLIDE 3 — Ranking municipal
   ========================================================================== */

function RankingMunicipal({ top }: { top: MunicipioAno[] }) {
  return (
    <motion.div variants={fadeSlideUp}>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Município</th>
              <th className="px-4 py-2.5 text-right">Área (ha)</th>
              <th className="px-4 py-2.5 text-right">Cicatrizes</th>
              <th className="px-4 py-2.5 text-right">Classe AHP máx.</th>
              <th className="px-4 py-2.5 text-right">% em prioritária</th>
              <th className="px-4 py-2.5 text-right">Mês pico</th>
              <th className="px-4 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {top.map((m, i) => {
              const pct = Number(m.pctAreaPrioritaria ?? 0);
              const cor = CORES_AHP[(m.classeMaxQueimada ?? 1) - 1];
              return (
                <tr
                  key={m.municipioCod}
                  className={`text-[13px] hover:bg-[var(--surface)] ${m.emAlerta ? "bg-red-500/[0.04]" : ""}`}
                >
                  <td className="px-4 py-2 text-[var(--text-subtle)] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-2 font-medium text-[var(--text)]">{m.municipioNome}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                    {formatNumber(Math.round(Number(m.areaQueimadaTotalHa)))}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--text-muted)]">
                    {formatNumber(m.nCicatrizesTotal)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                      style={{ backgroundColor: `${cor}25`, color: cor }}
                    >
                      {m.classeMaxQueimada ?? "—"} · {LABEL_AHP[m.classeMaxQueimada ?? 1] ?? "—"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-2 text-right tabular-nums"
                    style={{ color: pct > 50 ? "#EF4444" : "var(--text-muted)" }}
                  >
                    {pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--text-muted)]">
                    {m.mesPico ? MESES_LABEL[m.mesPico - 1] : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {m.emAlerta ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-red-400">
                        em alerta
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--text-subtle)]">—</span>
                    )}
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

/* ==========================================================================
   SLIDE 4 — Mensal por classe
   ========================================================================== */

function MensalPorClasse({ sazonalidade }: { sazonalidade: SazonalidadeRow[] }) {
  const data = MESES_LABEL.map((label, i) => {
    const mes = i + 1;
    const linha: Record<string, number | string> = { mes: label };
    for (const classe of [1, 2, 3, 4, 5]) {
      const row = sazonalidade.find((r) => r.mes === mes && r.classePrioridade === classe);
      linha[LABEL_AHP[classe]] = row ? Math.round(Number(row.areaHa)) : 0;
    }
    return linha;
  });

  return (
    <motion.div variants={fadeSlideUp}>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {[1, 2, 3, 4, 5].map((c) => (
                <linearGradient key={c} id={`fill-classe-${c}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CORES_AHP[c - 1]} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={CORES_AHP[c - 1]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v) => `${formatNumber(Number(v))} ha`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {[1, 2, 3, 4, 5].map((c) => (
              <Area
                key={c}
                type="monotone"
                dataKey={LABEL_AHP[c]}
                stackId="a"
                stroke={CORES_AHP[c - 1]}
                strokeWidth={1.5}
                fill={`url(#fill-classe-${c})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   SLIDE 5 — Série anual
   ========================================================================== */

function SerieAnual({ serie }: { serie: SerieAno[] }) {
  const data = serie.map((s) => ({
    ano: s.ano,
    area: Math.round(Number(s.areaQueimadaHa)),
    cicatrizes: s.nCicatrizes,
  }));
  return (
    <motion.div variants={fadeSlideUp}>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ano" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text-subtle)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
              formatter={(v, name) => name === "area" ? `${formatNumber(Number(v))} ha` : formatNumber(Number(v))}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="area" name="Área (ha)" stroke={COR} strokeWidth={2.5} dot={{ r: 4, fill: COR }} />
            <Line yAxisId="right" type="monotone" dataKey="cicatrizes" name="Cicatrizes" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   SLIDE 6 — Recorrência
   ========================================================================== */

function Recorrencia({ recorrentes }: { recorrentes: Recorrente[] }) {
  return (
    <motion.div variants={fadeSlideUp}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {recorrentes.slice(0, 30).map((m) => {
          const intensidade = m.anosCriticos / Math.max(1, m.totalAnos);
          return (
            <div
              key={m.municipioCod}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
              style={{ borderColor: intensidade >= 0.75 ? "rgba(239,68,68,0.3)" : undefined }}
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-[13px] font-medium text-[var(--text)]">
                  {m.municipioNome}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor:
                      intensidade >= 0.75 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                    color: intensidade >= 0.75 ? "#EF4444" : "#F59E0B",
                  }}
                >
                  {m.anosCriticos}/{m.totalAnos} anos
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {formatNumber(Math.round(Number(m.areaTotalHa)))} ha acumulados
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   SLIDE 7 — CGEO+
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
