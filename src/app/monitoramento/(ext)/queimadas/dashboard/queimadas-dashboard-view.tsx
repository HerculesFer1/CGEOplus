"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink } from "lucide-react";
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
import { MESES_LABEL, QUEIMADA_ESCALA_LOG, TEMA_COR } from "@/lib/monit-ext/constants";
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
  municipiosAno: MunicipioAno[];
  sazonalidade: SazonalidadeRow[];
  recorrentes: Recorrente[];
  ipaRanking: IpaMunicipio[];
  /** Ano selecionado ou "all" (multi-ano agregado). */
  anoAtual: number | "all";
  anosDisponiveis: number[];
  anoParcial: boolean;
}

const TOC = [
  { id: "visao", label: "Visão geral" },
  { id: "classes", label: "Por classe AHP" },
  { id: "municipal", label: "Panorama municipal" },
  { id: "mensal", label: "Evolução mensal" },
  { id: "anual", label: "Série anual" },
  { id: "recorrencia", label: "Recorrência" },
  { id: "cgeo", label: "Leitura CGEO+" },
  { id: "metodologia", label: "Metodologia" },
];

/** Nota de contexto discreta — texto miúdo com ícone, para ancorar a leitura
 *  de um slide sem competir com os números. */
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

export function QueimadasDashboardView({
  serie,
  topMunicipios,
  emAlerta,
  municipiosAno,
  sazonalidade,
  recorrentes,
  ipaRanking,
  anoAtual,
  anosDisponiveis,
  anoParcial,
}: Props) {
  // Quando "Todos os anos" ativo, `atual` vira o agregado da série (soma
  // dos KPIs). Caso contrário, é a linha do ano selecionado.
  const atual =
    anoAtual === "all"
      ? agregarSerieQueimadas(serie)
      : serie.find((s) => s.ano === anoAtual) ?? serie.at(-1)!;
  const areaAtual = Number(atual.areaQueimadaHa);
  const areaEmAlerta = emAlerta.reduce(
    (s, m) => s + Number(m.areaQueimadaTotalHa),
    0,
  );
  const labelAno = anoAtual === "all" ? "Todos os anos" : String(anoAtual);
  // Ano concreto para subcomponentes que exigem um ano específico
  // (banner de alerta, IPA, metodologia): "all" resolve pro último ano
  // com dados, que é o retrato mais recente.
  const anoConcreto: number =
    anoAtual === "all" ? serie.at(-1)?.ano ?? new Date().getFullYear() : anoAtual;

  return (
    <div className="pb-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Dashboard Queimadas · modo apresentação
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            <span style={{ color: COR }}>Queimadas</span> INPE{" "}
            <span className="text-[var(--text-muted)]">— {labelAno}</span>
          </h1>
          {anoParcial && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-500">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              Ano corrente — dados parciais até o último sync INPE
            </p>
          )}
        </div>
        <AnoDropdown anos={anosDisponiveis} anoAtual={anoAtual} corTema={COR} />
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
          <NotaContexto>
            <strong>Em alerta CGEO+</strong> = municípios cuja área queimada
            atingiu classe AHP máxima 4 ou 5 (Alta/Muito Alta prioridade
            ambiental) e mais de 50% da área queimada está dentro de zona
            prioritária. É o filtro que o CGEO+ usa para acionar triagem de
            campo.
          </NotaContexto>
          <AlertaBanner emAlerta={emAlerta} anoAtual={anoConcreto} />
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
          <NotaContexto>
            AHP (<em>Analytic Hierarchy Process</em>) ordena o território em 5
            classes de prioridade para conservação — 1 muito baixa, 5 muito
            alta. Fogo em classes 4-5 pressiona diretamente as áreas que a
            política pública quer proteger.
          </NotaContexto>
        </Slide>

        {/* SLIDE 3 — MUNICIPAL */}
        <Slide
          id="municipal"
          index={3}
          total={TOC.length}
          title="Panorama municipal"
          subtitle={`Área queimada por município em ${labelAno}. Ranking marca em vermelho os municípios em alerta CGEO+ (AHP 4-5 + >50% prioritária).`}
          corTema={COR}
          fluid
        >
          <MunicipalPanel municipiosAno={municipiosAno} topMunicipios={topMunicipios} />
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
          <NotaContexto>
            Áreas empilhadas — cada tom mostra a contribuição de uma classe AHP
            no total do mês. Concentração em Ago-Out reflete o pico da
            estiagem; picos fora dessa janela são anomalia e merecem
            investigação.
          </NotaContexto>
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
          <NotaContexto>
            Eixo esquerdo em hectares (linha cheia · área queimada). Eixo
            direito em contagem (linha tracejada · nº de cicatrizes AQ1km).
            {atual.ano === new Date().getFullYear() && " O ano corrente pode aparecer abaixo do padrão histórico — a série só completa após o último sync INPE do ano."}
          </NotaContexto>
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
          <NotaContexto>
            Cada card mostra <strong>anos críticos ÷ total de anos com dado</strong>.
            Municípios em vermelho (≥ 75%) são fogo crônico — a política
            precisa ser contínua, não pontual. Ordenados pela intensidade e,
            em empate, pela área acumulada.
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
            (divergência PRODES × MapBiomas). Municípios com IPA ≥ 70 são
            prioridade máxima; 50-69 pressão média; abaixo de 50 baixa.
            &quot;—&quot; significa fonte sem cobertura naquele município no ano.
          </NotaContexto>
          <AssinaturaAmbientalCard
            corTema={COR}
            municipios={emAlerta.slice(0, 8).map((m) => m.municipioNome)}
          />
        </Slide>

        {/* SLIDE 8 — METODOLOGIA */}
        <Slide
          id="metodologia"
          index={8}
          total={TOC.length}
          title="Metodologia e fonte"
          subtitle="Produto, cadência de ingestão, cruzamentos e limitações — do INPE ao alerta CGEO+."
          corTema={COR}
          fluid
        >
          <Metodologia anoAtual={anoConcreto} />
        </Slide>
      </SlideDeck>
    </div>
  );
}

/* ==========================================================================
   Seletor de ano (chip switch)
   ========================================================================== */

/** Agrega a série anual em um "ano sintético" para o modo Todos os anos. */
function agregarSerieQueimadas(serie: SerieAno[]): SerieAno {
  const anos = serie.map((s) => s.ano);
  const anoLabel = anos.length > 1 ? Math.min(...anos) : (anos[0] ?? 0);
  return {
    ano: anoLabel,
    areaQueimadaHa: String(serie.reduce((s, r) => s + Number(r.areaQueimadaHa ?? 0), 0)),
    nCicatrizes: serie.reduce((s, r) => s + r.nCicatrizes, 0),
    nMunicipiosAfetados: Math.max(
      0,
      ...serie.map((r) => r.nMunicipiosAfetados),
    ),
  };
}

/* ==========================================================================
   SLIDE 3 — Municipal com mapa + toggle prioridade + card lateral
   ========================================================================== */

function MunicipalPanel({
  municipiosAno,
  topMunicipios,
}: {
  municipiosAno: MunicipioAno[];
  topMunicipios: MunicipioAno[];
}) {
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [selecionado, setSelecionado] = useState<MunicipioAno | null>(null);

  const destacados = useMemo(
    () =>
      municipiosAno.filter(
        (m) =>
          m.classeMaxQueimada !== null &&
          m.classeMaxQueimada >= 4 &&
          Number(m.pctAreaPrioritaria ?? 0) > 50,
      ),
    [municipiosAno],
  );

  const dadosMapa = useMemo(() => {
    const base = municipiosAno.map((m) => ({
      municipio: m.municipioNome,
      valor: Math.round(Number(m.areaQueimadaTotalHa)),
      cod: m.municipioCod,
    }));
    if (!priorityOnly) return base;
    const set = new Set(destacados.map((m) => m.municipioCod));
    // Zera municípios fora do destaque — o mapa os pinta como "sem dado",
    // preservando o contorno do estado. Mesmo comportamento do upstream.
    return base.map((d) => (set.has(d.cod) ? d : { ...d, valor: 0 }));
  }, [municipiosAno, priorityOnly, destacados]);

  return (
    <motion.div variants={fadeSlideUp} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setPriorityOnly((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
            priorityOnly
              ? "border-red-500/40 bg-red-500/10 text-red-500"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
          {priorityOnly ? "Mostrando só prioridade alta" : "Só prioridade alta"}
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{
              backgroundColor: priorityOnly ? "rgba(239,68,68,0.2)" : "var(--elevated)",
              color: priorityOnly ? "#EF4444" : "var(--text-muted)",
            }}
          >
            {destacados.length}
          </span>
        </button>
        <p className="text-[11px] text-[var(--text-muted)]">
          Clique num município do mapa para abrir o cartão flutuante de contexto.
        </p>
      </div>

      <div className="relative">
        <MapaChoropleth
          dados={dadosMapa}
          cor={COR}
          labelMetrica="Área queimada"
          sufixo="ha"
          escalaLog={QUEIMADA_ESCALA_LOG}
          onSelect={(nome) => {
            const m = municipiosAno.find(
              (mm) => mm.municipioNome.toLowerCase() === nome.toLowerCase(),
            );
            if (m) setSelecionado(m);
          }}
        />
        {/* Card do município selecionado — flutua sobre o canto direito do mapa
         *  para não roubar largura horizontal quando ninguém foi clicado. */}
        {selecionado && (
          <div className="pointer-events-auto absolute right-4 top-4 z-20 w-64 max-w-[calc(100%-2rem)] rounded-2xl border bg-[var(--elevated)]/95 p-4 shadow-[var(--shadow-md)] backdrop-blur-md">
            <MunicipioCardBody
              municipio={selecionado}
              onClose={() => setSelecionado(null)}
            />
          </div>
        )}
      </div>

      <NotaContexto>
        Escala log de área queimada — os tons quentes crescem a cada faixa
        (1-500 → 500-2k → 2k-5k → 5k-10k → &gt;10k ha). O toggle
        <em> Só prioridade alta</em> aplica o mesmo critério do alerta CGEO+:
        classe AHP 4-5 combinada com &gt;50% da área em zona prioritária.
      </NotaContexto>

      <RankingMunicipal top={topMunicipios} />
    </motion.div>
  );
}

function MunicipioCardBody({
  municipio,
  onClose,
}: {
  municipio: MunicipioAno;
  onClose: () => void;
}) {
  const cor = CORES_AHP[(municipio.classeMaxQueimada ?? 1) - 1];
  const pctPrio = Number(municipio.pctAreaPrioritaria ?? 0);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            Município
          </p>
          <h4 className="truncate text-base font-semibold text-[var(--text)]" title={municipio.municipioNome}>
            {municipio.municipioNome}
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
        <div className="rounded-lg bg-[var(--elevated)] p-2">
          <dt className="text-[var(--text-subtle)]">Área queimada</dt>
          <dd className="font-semibold tabular-nums text-[var(--text)]">
            {formatNumber(Math.round(Number(municipio.areaQueimadaTotalHa)))} ha
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--elevated)] p-2">
          <dt className="text-[var(--text-subtle)]">Cicatrizes</dt>
          <dd className="font-semibold tabular-nums text-[var(--text)]">
            {formatNumber(municipio.nCicatrizesTotal)}
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--elevated)] p-2">
          <dt className="text-[var(--text-subtle)]">Classe AHP máx.</dt>
          <dd className="mt-0.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${cor}25`, color: cor }}
            >
              {municipio.classeMaxQueimada ?? "—"} · {LABEL_AHP[municipio.classeMaxQueimada ?? 1] ?? "—"}
            </span>
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--elevated)] p-2">
          <dt className="text-[var(--text-subtle)]">% em prioritária</dt>
          <dd
            className="font-semibold tabular-nums"
            style={{ color: pctPrio > 50 ? "#EF4444" : "var(--text)" }}
          >
            {pctPrio.toFixed(1)}%
          </dd>
        </div>
        <div className="col-span-2 rounded-lg bg-[var(--elevated)] p-2">
          <dt className="text-[var(--text-subtle)]">Mês de pico</dt>
          <dd className="font-semibold text-[var(--text)]">
            {municipio.mesPico ? MESES_LABEL[municipio.mesPico - 1] : "—"}
          </dd>
        </div>
      </dl>
      {municipio.emAlerta && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-[11px] font-medium text-red-500">
          Em alerta CGEO+ — classe AHP 4-5 e &gt;50% da área queimada em zona prioritária.
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SLIDE 8 — Metodologia
   ========================================================================== */

function Metodologia({ anoAtual }: { anoAtual: number }) {
  return (
    <motion.div variants={fadeSlideUp} className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border bg-[var(--surface)] p-5">
        <h4 className="text-sm font-semibold text-[var(--text)]">Fonte de dados</h4>
        <dl className="space-y-1.5 text-[12px]">
          <MetodItem k="Produto" v="Área Queimada AQ1km V6 — Coleção 2" />
          <MetodItem k="Instituição" v="INPE / LASA-UFRJ" />
          <MetodItem k="Satélites" v="MODIS (AQUA + TERRA)" />
          <MetodItem k="Resolução" v="1 km" />
          <MetodItem k="Cadência" v="Mensal — INPE publica mês N no início de N+1" />
          <MetodItem k="Sync CGEO+" v="Dia 15 de cada mês, 04h UTC (Vercel Cron)" />
          <MetodItem k="Ano da leitura atual" v={String(anoAtual)} />
        </dl>
      </div>

      <div className="space-y-3 rounded-2xl border bg-[var(--surface)] p-5">
        <h4 className="text-sm font-semibold text-[var(--text)]">Cruzamento CGEO+</h4>
        <ol className="ml-4 list-decimal space-y-1.5 text-[12px] text-[var(--text-muted)]">
          <li>Cicatrizes mensais AQ1km recortadas para o Piauí</li>
          <li>Cruzamento vetorial com as 5 classes AHP de prioridade ambiental</li>
          <li>Agregação por município × ano × mês × classe</li>
          <li>
            Flag <em>em alerta</em>: classe AHP máxima 4-5 combinada com &gt;50%
            da área queimada dentro de zona prioritária
          </li>
          <li>
            Composição do IPA (50% IPI + 30% queimadas em prioritária + 20%
            divergência PRODES) para a leitura unificada
          </li>
        </ol>
      </div>

      <div className="lg:col-span-2 space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-500">
          <AlertTriangle className="h-4 w-4" strokeWidth={2} />
          Limitações importantes
        </h4>
        <ul className="ml-4 list-disc space-y-1.5 text-[12px] text-[var(--text-muted)]">
          <li>
            <strong>Produto provisório INPE</strong> — usar como estimativa
            exploratória, não como base para autuação ambiental.
          </li>
          <li>
            <strong>Superestimação de área</strong> — resolução de 1 km gera
            commission error; pixels com fogo parcial contam integralmente.
          </li>
          <li>
            <strong>Cicatrizes ≠ focos</strong> — polígonos representam área
            queimada; um evento pode gerar múltiplos polígonos.
          </li>
          <li>
            <strong>Cobertura por nuvens</strong> — Jan-Mar no Piauí tem alta
            nebulosidade e pode subestimar cicatrizes.
          </li>
        </ul>
        <a
          href="https://queimadas.dgi.inpe.br/queimadas/aq1km/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500 hover:underline"
        >
          Documentação AQ1km INPE <ExternalLink className="h-3 w-3" strokeWidth={2} />
        </a>
      </div>
    </motion.div>
  );
}

function MetodItem({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--border)]/50 pb-1 last:border-0">
      <dt className="text-[var(--text-subtle)]">{k}</dt>
      <dd className="text-right font-medium text-[var(--text)]">{v}</dd>
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
