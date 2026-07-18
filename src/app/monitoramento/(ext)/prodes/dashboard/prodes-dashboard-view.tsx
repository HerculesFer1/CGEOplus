"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
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

import { AnoDropdown } from "@/components/monit-ext/ano-dropdown";
import { AssinaturaAmbientalCard } from "@/components/monit-ext/assinatura-ambiental";
import { MapaChoropleth } from "@/components/monit-ext/mapa-choropleth";
import { Slide, SlideDeck } from "@/components/monit-ext/slide-deck";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { ANO_MIN, TEMA_COR } from "@/lib/monit-ext/constants";
import type { IpaMunicipio } from "@/lib/monit-ext/ipa";
import { formatNumber } from "@/lib/utils";

const COR = TEMA_COR.prodes;

const PRODES_ESCALA_LOG = [
  { limite: 0, cor: "#F5F5F5" },
  { limite: 1, cor: "#D1FAE5" },
  { limite: 100, cor: "#A7F3D0" },
  { limite: 500, cor: "#6EE7B7" },
  { limite: 2000, cor: "#10B981" },
  { limite: 10000, cor: "#047857" },
];

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
  /** Ano selecionado ou "all" (multi-ano agregado). */
  anoAtual: number | "all";
  anosDisponiveis: number[];
  anoParcial: boolean;
}

const TOC = [
  { id: "visao", label: "Visão geral" },
  { id: "temporal", label: "Evolução temporal" },
  { id: "vetor", label: "Vetor de pressão" },
  { id: "cobertura", label: "Cobertura PRODES" },
  { id: "ranking", label: "Top municípios" },
  { id: "base2022", label: `Comparativo desde ${ANO_MIN}` },
  { id: "cgeo", label: "Leitura CGEO+" },
];

export function ProdesDashboardView({
  ciclos,
  vetores,
  cobertura,
  topMunicipios,
  ipaRanking,
  anoAtual,
  anosDisponiveis,
  anoParcial,
}: Props) {
  // Ciclos "publicados" = com validação cruzada concluída (n_total > 0).
  // O ciclo do ano corrente pode existir com n_total=0 até o PRODES publicar (out).
  const publicados = ciclos.filter((c) => c.nTotal > 0);
  // Quando "Todos os anos" ativo, `atual` vira o agregado dos ciclos
  // publicados (concordância recalculada). Caso contrário, é o ciclo do
  // ano selecionado (fallback pro último publicado).
  const atual =
    anoAtual === "all"
      ? agregarCiclosProdes(publicados)
      : publicados.find((c) => c.anoProdesRef === anoAtual) ??
        publicados.at(-1) ??
        ciclos.at(-1)!;
  // Totalizadores só somam ciclos publicados — o card diz "acumulados nos
  // ciclos publicados" e incluir 2026 (só sem_prodes=747) contaria como
  // discordância o que na verdade é ciclo em aberto.
  const total = publicados.reduce((s, c) => s + c.nTotal, 0);
  const conc = publicados.reduce((s, c) => s + c.nConcordantes, 0);
  const disc = publicados.reduce((s, c) => s + c.nDiscordantes, 0);
  const sem = publicados.reduce((s, c) => s + c.nSemProdes, 0);
  const base = publicados.find((c) => c.anoProdesRef === ANO_MIN) ?? publicados[0];
  const labelAno = anoAtual === "all" ? "Todos os anos" : String(anoAtual);
  const anoConcreto: number =
    anoAtual === "all"
      ? publicados.at(-1)?.anoProdesRef ?? new Date().getFullYear()
      : anoAtual;
  // Em "Todos os anos", agrega por município somando a área validada e
  // detectada de todos os ciclos (antes passava as linhas município×ano
  // duplicadas, e o choropleth — que indexa por município — só guardava o
  // valor do último ciclo, distorcendo o mapa). Em ano específico, filtra os
  // que têm registro no ciclo daquele ano.
  const topMunicipiosAno = useMemo(() => {
    if (anoAtual !== "all") {
      return topMunicipios.filter((m) => m.ano === anoAtual);
    }
    const porMunicipio = new Map<string, TopMun>();
    for (const m of topMunicipios) {
      const acc = porMunicipio.get(m.municipio);
      if (!acc) {
        porMunicipio.set(m.municipio, { ...m });
      } else {
        acc.concordanteHa = String(
          Number(acc.concordanteHa) + Number(m.concordanteHa),
        );
        acc.totalHa = String(Number(acc.totalHa) + Number(m.totalHa));
        acc.ano = Math.max(acc.ano, m.ano);
      }
    }
    return [...porMunicipio.values()]
      .map((m) => ({
        ...m,
        pctConcordancia:
          Number(m.totalHa) > 0
            ? ((Number(m.concordanteHa) / Number(m.totalHa)) * 100).toFixed(2)
            : "0",
      }))
      .sort((a, b) => Number(b.totalHa) - Number(a.totalHa));
  }, [anoAtual, topMunicipios]);

  return (
    <div className="pb-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Dashboard PRODES · modo apresentação
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            <span style={{ color: COR }}>PRODES</span> Cerrado{" "}
            <span className="text-[var(--text-muted)]">— {labelAno}</span>
          </h1>
          {anoParcial && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-500">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              Ciclo em aberto — PRODES publica em outubro
            </p>
          )}
        </div>
        <AnoDropdown anos={anosDisponiveis} anoAtual={anoAtual} corTema={COR} />
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
          <NotaContexto>
            <strong>Concordância</strong> = alerta MapBiomas confirmado pelo
            polígono PRODES no mesmo ano. <strong>Discordante</strong> =
            MapBiomas detectou mas PRODES não confirmou (falso positivo
            provável). <strong>Sem PRODES</strong> = ainda não coberto pelo
            ciclo anual (publicado em outubro).
          </NotaContexto>
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
          <NotaContexto>
            Linha cheia (concordância) subindo = MapBiomas e PRODES estão cada
            vez mais alinhados. Linha tracejada (cobertura média) mede o
            percentual médio do polígono de alerta que o PRODES efetivamente
            confirmou.
          </NotaContexto>
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
          <NotaContexto>
            Cada barra é um vetor de pressão registrado na tabela de alertas.
            Agricultura domina o Cerrado piauiense; vetores emergentes
            (mineração, energia renovável) valem monitoramento apesar do
            volume menor — costumam gerar impacto ambiental desproporcional.
          </NotaContexto>
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
          <NotaContexto>
            Cada faixa mostra quantos alertas MapBiomas têm o dado percentual
            de sobreposição com polígono PRODES. Faixa <strong>0%</strong>
            concentra os alertas <em>discordantes</em>. Faixa
            <strong> 90-100%</strong>: dupla confirmação forte — prioritário
            para autuação.
          </NotaContexto>
        </Slide>

        {/* SLIDE 5 — TOP MUNICÍPIOS */}
        <Slide
          id="ranking"
          index={5}
          total={TOC.length}
          title="Top municípios validados"
          subtitle={`Onde MapBiomas e PRODES mais concordam sobre desmatamento em ${labelAno} — maior área com dupla confirmação.`}
          corTema={COR}
          fluid
        >
          <MapaMunicipalProdes
            topMunicipios={topMunicipiosAno.length > 0 ? topMunicipiosAno : topMunicipios}
            anoAtual={anoConcreto}
          />
          <NotaContexto>
            Escala log de área validada — municípios sem alerta ficam em
            cinza claro. A validação cruzada mostra concentração espacial
            dos alertas de dupla fonte.
          </NotaContexto>
          <RankingMunicipal top={topMunicipiosAno.length > 0 ? topMunicipiosAno : topMunicipios.slice(0, 20)} />
        </Slide>

        {/* SLIDE 6 — COMPARATIVO ANO A ANO DESDE 2022 */}
        <Slide
          id="base2022"
          index={6}
          total={TOC.length}
          title={`Comparativo desde ${ANO_MIN}`}
          subtitle={`${ANO_MIN} é o marco temporal do projeto REDD+ Piauí. Deltas de concordância vs. o ano-base.`}
          corTema={COR}
        >
          <ComparativoBaseProdes base={base} publicados={publicados} />
          <NotaContexto>
            Deltas de <strong>concordância</strong> vs. {ANO_MIN}: verde =
            mais dupla confirmação (bom); vermelho = menos. Anos com ciclo
            em aberto (n_total = 0) não entram no comparativo.
          </NotaContexto>
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
          <IpaRanking ipa={ipaRanking} anoAtual={anoConcreto} />
          <NotaContexto>
            IPA (0-100) = 50% <strong>IPI</strong> (Índice de Pressão
            Irregular · MapBiomas) + 30% <strong>Fogo</strong> em áreas
            prioritárias (Queimadas AQ1km) + 20% <strong>ΔPR</strong>
            (divergência PRODES × MapBiomas). Renormaliza pesos quando faltar
            cobertura em alguma fonte.
          </NotaContexto>
          <AssinaturaAmbientalCard
            corTema={COR}
            municipios={topMunicipios.slice(0, 8).map((m) => m.municipio)}
          />
        </Slide>
      </SlideDeck>
    </div>
  );
}

/* ==========================================================================
   Seletor de ano + Mapa municipal + Comparativo 2022
   ========================================================================== */

/** Agrega os ciclos publicados num ciclo sintético para o modo Todos os anos. */
function agregarCiclosProdes(publicados: Ciclo[]): Ciclo {
  const anos = publicados.map((c) => c.anoProdesRef);
  const anoLabel = anos.length > 1 ? Math.min(...anos) : (anos[0] ?? 0);
  const nTotal = publicados.reduce((s, c) => s + c.nTotal, 0);
  const nConcordantes = publicados.reduce((s, c) => s + c.nConcordantes, 0);
  const nDiscordantes = publicados.reduce((s, c) => s + c.nDiscordantes, 0);
  const nSemProdes = publicados.reduce((s, c) => s + c.nSemProdes, 0);
  const pctConcordancia =
    nTotal > 0 ? ((nConcordantes / nTotal) * 100).toFixed(2) : "0.00";
  // Média simples da cobertura entre ciclos com valor — evita pesar demais
  // ciclos com poucas amostras.
  const coberturas = publicados
    .map((c) => Number(c.mediaCoberturaPct ?? 0))
    .filter((v) => v > 0);
  const mediaCoberturaPct =
    coberturas.length > 0
      ? (coberturas.reduce((s, v) => s + v, 0) / coberturas.length).toFixed(2)
      : null;
  return {
    anoProdesRef: anoLabel,
    nTotal,
    nConcordantes,
    nDiscordantes,
    nSemProdes,
    pctConcordancia,
    mediaCoberturaPct,
  };
}

function MapaMunicipalProdes({
  topMunicipios,
  anoAtual,
}: {
  topMunicipios: TopMun[];
  anoAtual: number;
}) {
  const [selecionado, setSelecionado] = useState<TopMun | null>(null);
  return (
    <motion.div variants={fadeSlideUp} className="relative">
      <MapaChoropleth
        dados={topMunicipios.map((m) => ({
          municipio: m.municipio,
          valor: Math.round(Number(m.totalHa)),
        }))}
        cor={COR}
        labelMetrica="Área validada"
        sufixo="ha"
        escalaLog={PRODES_ESCALA_LOG}
        onSelect={(nome) => {
          const m = topMunicipios.find(
            (mm) => mm.municipio.toLowerCase() === nome.toLowerCase(),
          );
          if (m) setSelecionado(m);
        }}
      />
      {selecionado && (
        <div className="pointer-events-auto absolute right-4 top-4 z-20 w-64 max-w-[calc(100%-2rem)] rounded-2xl border bg-[var(--elevated)]/95 p-4 shadow-[var(--shadow-md)] backdrop-blur-md">
          <ProdesMunicipioCard
            municipio={selecionado}
            anoAtual={anoAtual}
            onClose={() => setSelecionado(null)}
          />
        </div>
      )}
    </motion.div>
  );
}

function ProdesMunicipioCard({
  municipio,
  anoAtual,
  onClose,
}: {
  municipio: TopMun;
  anoAtual: number;
  onClose: () => void;
}) {
  const pct = Number(municipio.pctConcordancia ?? 0);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Município · ciclo {anoAtual}
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
            {formatNumber(Math.round(Number(municipio.totalHa)))} ha
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">Concordante</dt>
          <dd className="font-semibold tabular-nums" style={{ color: COR }}>
            {formatNumber(Math.round(Number(municipio.concordanteHa)))} ha
          </dd>
        </div>
        <div className="col-span-2 rounded-lg bg-[var(--surface)] p-2">
          <dt className="text-[var(--text-subtle)]">% concordância</dt>
          <dd
            className="font-semibold tabular-nums"
            style={{ color: pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444" }}
          >
            {pct.toFixed(1)}%
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ComparativoBaseProdes({
  base,
  publicados,
}: {
  base: Ciclo | undefined;
  publicados: Ciclo[];
}) {
  const linhas = useMemo(() => {
    if (!base) return [];
    const baseConc = Number(base.pctConcordancia ?? 0);
    return publicados
      .filter((c) => c.anoProdesRef >= base.anoProdesRef)
      .map((c) => {
        const conc = Number(c.pctConcordancia ?? 0);
        return {
          c,
          deltaConc: Number((conc - baseConc).toFixed(1)),
          deltaAlertas: c.nTotal - base.nTotal,
        };
      });
  }, [base, publicados]);

  if (!base) {
    return (
      <div className="rounded-2xl border bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]">
        Ainda não temos ciclo publicado em {ANO_MIN} para servir de base.
      </div>
    );
  }

  return (
    <motion.div variants={fadeSlideUp} className="overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          <tr>
            <th className="px-4 py-2.5">Ciclo</th>
            <th className="px-4 py-2.5 text-right">Alertas</th>
            <th className="px-4 py-2.5 text-right">Δ vs {base.anoProdesRef}</th>
            <th className="px-4 py-2.5 text-right">Concordantes</th>
            <th className="px-4 py-2.5 text-right">Discordantes</th>
            <th className="px-4 py-2.5 text-right">Concordância</th>
            <th className="px-4 py-2.5 text-right">Δ vs {base.anoProdesRef}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {linhas.map(({ c, deltaConc, deltaAlertas }) => {
            const isBase = c.anoProdesRef === base.anoProdesRef;
            return (
              <tr key={c.anoProdesRef} className={`text-[13px] ${isBase ? "bg-[var(--surface)]/60" : ""}`}>
                <td className="px-4 py-2 font-medium text-[var(--text)]">
                  {c.anoProdesRef}
                  {isBase && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-500">
                      base
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {formatNumber(c.nTotal)}
                </td>
                <td className="px-4 py-2 text-right">
                  {isBase ? "—" : <DeltaChip value={deltaAlertas} bomSeNegativo={false} />}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {formatNumber(c.nConcordantes)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-muted)]">
                  {formatNumber(c.nDiscordantes)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text)]">
                  {Number(c.pctConcordancia ?? 0).toFixed(1)}%
                </td>
                <td className="px-4 py-2 text-right">
                  {isBase ? "—" : <DeltaChip value={deltaConc} bomSeNegativo={false} sufixo="pp" />}
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
  bomSeNegativo: boolean;
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
      {Number.isInteger(value) ? formatNumber(value) : value.toFixed(1)}
      {sufixo}
    </span>
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
