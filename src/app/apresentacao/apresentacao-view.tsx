"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Expand,
  Home,
  Minimize,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";

import type { MetaComProgresso } from "@/lib/services/metas.service";
import {
  META_ESCOPO_LABEL,
  META_METRICA_LABEL,
} from "@/lib/validators/meta";
import {
  TIPO_EVENTO_COR,
  TIPO_EVENTO_LABEL,
  type TipoEvento,
} from "@/lib/validators/evento";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/design/motion";

/* ==========================================================================
   Tipos das props (todos JSON-serializable)
   ========================================================================== */

interface Membro {
  id: string;
  apelido: string | null;
  nome: string;
  avatarUrl: string | null;
  tipoVinculo: string;
}
interface NucleoSlide {
  id: string;
  nome: string;
  corTema: string;
  minMembros: number;
  membros: Membro[];
  analisesSemana: number;
}
interface TopServidor {
  id: string;
  apelido: string | null;
  nome: string;
  avatarUrl: string | null;
  corTema: string | null;
  total: number;
}
interface ResultadosSlide {
  totalSemana: number;
  finalizadasSemana: number;
  deltaSemana: number;
  taxaFinalSemana: number;
  topServidores: TopServidor[];
}
interface EventoSlide {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  local: string | null;
  nucleoNome: string | null;
  nucleoCorTema: string | null;
  inicioIso: string;
  fimIso: string;
  diaInteiro: boolean;
}

interface Props {
  semana: { iso: number; ano: number; inicio: string; fim: string };
  nucleos: NucleoSlide[];
  resultados: ResultadosSlide;
  metasAtivas: MetaComProgresso[];
  proximasMetas: MetaComProgresso[];
  eventos: EventoSlide[];
}

/* ==========================================================================
   Constantes visuais
   ========================================================================== */

const MES_ABBR = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

const DIA_SEMANA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

const FAROL_TONE: Record<MetaComProgresso["farol"], string> = {
  verde: "#32D74B",
  amarelo: "#FF9F0A",
  vermelho: "#FF453A",
};

/* ==========================================================================
   ApresentacaoView — controlador
   ========================================================================== */

export function ApresentacaoView(props: Props) {
  const router = useRouter();
  const [slideIdx, setSlideIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = useMemo(
    () => [
      { key: "capa", render: () => <CapaSlide semana={props.semana} /> },
      {
        key: "nucleos",
        render: () => <NucleosSlide nucleos={props.nucleos} />,
      },
      {
        key: "resultados",
        render: () => <ResultadosSlideView r={props.resultados} />,
      },
      {
        key: "metas-ativas",
        render: () => <MetasSlide titulo="Metas ativas" metas={props.metasAtivas} />,
      },
      {
        key: "proximas-metas",
        render: () => (
          <MetasSlide
            titulo="Novas metas — próximo período"
            metas={props.proximasMetas}
            emptyMessage="Nenhuma meta cadastrada para o próximo período. Registre no menu Metas antes de fechar a apresentação."
          />
        ),
      },
      {
        key: "eventos",
        render: () => <EventosSlide eventos={props.eventos} />,
      },
    ],
    [props],
  );

  const totalSlides = slides.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setSlideIdx((i) => Math.min(totalSlides - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setSlideIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setSlideIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSlideIdx(totalSlides - 1);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          router.push("/dashboard");
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-neutral-950 text-white">
      {/* Slide */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={slides[slideIdx].key}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ ...spring.gentle, opacity: { duration: 0.2 } }}
            className="mx-auto flex h-full w-full max-w-[1600px] flex-col px-8 py-12 lg:px-16 lg:py-16"
          >
            {slides[slideIdx].render()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Zonas de clique para navegar (mais amigável na TV) */}
      <button
        aria-label="Slide anterior"
        onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
        className="absolute inset-y-0 left-0 z-10 w-1/6 cursor-w-resize opacity-0 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent hover:opacity-100"
      />
      <button
        aria-label="Próximo slide"
        onClick={() =>
          setSlideIdx((i) => Math.min(totalSlides - 1, i + 1))
        }
        className="absolute inset-y-0 right-0 z-10 w-1/6 cursor-e-resize opacity-0 hover:bg-gradient-to-l hover:from-white/5 hover:to-transparent hover:opacity-100"
      />

      {/* Controles do rodapé */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70 backdrop-blur hover:text-white"
            aria-label="Sair da apresentação"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            Sair
          </button>
          <button
            onClick={() => router.push("/apresentacao/dashboards")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70 backdrop-blur hover:text-white"
            aria-label="Montar roteiro de dashboards"
            title="Apresentação encadeada de MapBiomas, PRODES, Queimadas…"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            Roteiro de dashboards
          </button>
          <button
            onClick={toggleFullscreen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur hover:text-white"
            aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            title="Tecla F"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Expand className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>

        {/* Progresso: bolinhas */}
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setSlideIdx(i)}
              aria-label={`Ir para slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slideIdx ? "w-8 bg-white" : "w-1.5 bg-white/25",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSlideIdx(0)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur hover:text-white"
            aria-label="Voltar para capa"
            title="Tecla Home"
          >
            <Home className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
            disabled={slideIdx === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur hover:text-white disabled:opacity-30"
            aria-label="Anterior"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-white/50">
            {slideIdx + 1} / {totalSlides}
          </span>
          <button
            onClick={() =>
              setSlideIdx((i) => Math.min(totalSlides - 1, i + 1))
            }
            disabled={slideIdx === totalSlides - 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur hover:text-white disabled:opacity-30"
            aria-label="Próximo"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Slide 1 · Capa
   ========================================================================== */

function CapaSlide({ semana }: { semana: Props["semana"] }) {
  const ini = new Date(semana.inicio);
  const fim = new Date(semana.fim);
  const rangeLabel = `${ini.getDate().toString().padStart(2, "0")}–${fim
    .getDate()
    .toString()
    .padStart(2, "0")} ${MES_ABBR[fim.getMonth()]} · ${fim.getFullYear()}`;

  return (
    <div className="m-auto flex max-w-3xl flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.snappy, delay: 0.1 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70"
      >
        <Sparkles className="h-3 w-3" strokeWidth={2} />
        Reunião semanal
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.gentle, delay: 0.2 }}
        className="text-6xl font-semibold tracking-tight lg:text-8xl"
      >
        CGEO+
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.gentle, delay: 0.35 }}
        className="mt-4 text-xl text-white/60 lg:text-2xl"
      >
        Semana {semana.iso} · {rangeLabel}
      </motion.p>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring.gentle, delay: 0.5 }}
        className="mt-12 flex items-center gap-6 text-[11px] uppercase tracking-widest text-white/40"
      >
        <span>← → para navegar</span>
        <span>·</span>
        <span>F para tela cheia</span>
        <span>·</span>
        <span>Esc para sair</span>
      </motion.div>
    </div>
  );
}

/* ==========================================================================
   Slide 2 · Disposição dos núcleos
   ========================================================================== */

function NucleosSlide({ nucleos }: { nucleos: NucleoSlide[] }) {
  return (
    <>
      <SlideHeader
        eyebrow="Disposição atual"
        title="Núcleos do CGEO"
        subtitle={`${nucleos.length} núcleos ativos · ${nucleos.reduce(
          (s, n) => s + n.membros.length,
          0,
        )} servidores em vínculo principal`}
      />
      <div className="mt-10 grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {nucleos.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.05 * i }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: n.corTema }}
              aria-hidden
            />
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: n.corTema }}
                >
                  {n.nome}
                </h3>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">
                  {n.membros.length} membro
                  {n.membros.length === 1 ? "" : "s"}
                  {n.membros.length < n.minMembros && (
                    <span className="ml-2 text-[var(--warning)]">
                      abaixo mínimo ({n.minMembros})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums">
                  {n.analisesSemana}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  análises sem.
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {n.membros.map((m) => (
                <MembroAvatar key={m.id} membro={m} corTema={n.corTema} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function MembroAvatar({
  membro,
  corTema,
}: {
  membro: Membro;
  corTema: string;
}) {
  const label = membro.apelido ?? membro.nome.split(" ")[0];
  const initials =
    membro.apelido?.[0]?.toUpperCase() ?? membro.nome[0]?.toUpperCase() ?? "?";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs"
      title={membro.nome}
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: corTema }}
      >
        {initials}
      </span>
      {label}
    </span>
  );
}

/* ==========================================================================
   Slide 3 · Resultados da semana
   ========================================================================== */

function ResultadosSlideView({ r }: { r: ResultadosSlide }) {
  const delta = r.deltaSemana;
  const deltaCor =
    delta > 0
      ? "text-emerald-400"
      : delta < 0
      ? "text-rose-400"
      : "text-white/50";

  return (
    <>
      <SlideHeader
        eyebrow="Semana"
        title="Resultados"
        subtitle="Números da semana em curso — atualizado agora"
      />
      <div className="mt-10 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring.gentle}
          className="grid grid-cols-2 gap-5"
        >
          <KpiBig
            label="Análises na semana"
            value={r.totalSemana.toLocaleString("pt-BR")}
            hint={
              <span className={deltaCor}>
                {delta > 0 ? (
                  <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                ) : delta < 0 ? (
                  <TrendingDown className="mr-1 inline h-3.5 w-3.5" />
                ) : null}
                {delta === 0
                  ? "estável"
                  : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}% vs sem. ant.`}
              </span>
            }
          />
          <KpiBig
            label="Finalizadas"
            value={r.finalizadasSemana.toLocaleString("pt-BR")}
            hint={
              <span className="text-white/50">
                {r.taxaFinalSemana.toFixed(1)}% de finalização
              </span>
            }
          />
          <KpiBig
            label="Servidores produtivos"
            value={r.topServidores.length.toString()}
            hint={<span className="text-white/50">registraram análises</span>}
          />
          <KpiBig
            label="Média por servidor"
            value={
              r.topServidores.length > 0
                ? Math.round(
                    r.totalSemana / r.topServidores.length,
                  ).toLocaleString("pt-BR")
                : "—"
            }
            hint={<span className="text-white/50">análises/pessoa</span>}
          />
        </motion.div>

        {/* Top servidores */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring.gentle}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-widest text-white/50">
            <Trophy className="h-4 w-4" strokeWidth={1.75} />
            Top da semana
          </div>
          {r.topServidores.length === 0 ? (
            <p className="text-white/40">Sem análises registradas na semana.</p>
          ) : (
            <ol className="space-y-3">
              {r.topServidores.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-6 text-right text-lg font-bold tabular-nums text-white/60">
                    {i + 1}
                  </span>
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      backgroundColor: s.corTema ?? "#4A4A4A",
                    }}
                  >
                    {(s.apelido?.[0] ?? s.nome[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-lg">
                    {s.apelido ?? s.nome}
                  </span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {s.total}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </motion.div>
      </div>
    </>
  );
}

function KpiBig({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
      <div className="mt-2 text-5xl font-semibold tabular-nums lg:text-6xl">
        {value}
      </div>
      {hint && <div className="mt-2 text-xs">{hint}</div>}
    </div>
  );
}

/* ==========================================================================
   Slides 4 & 5 · Metas
   ========================================================================== */

function MetasSlide({
  titulo,
  metas,
  emptyMessage,
}: {
  titulo: string;
  metas: MetaComProgresso[];
  emptyMessage?: string;
}) {
  return (
    <>
      <SlideHeader
        eyebrow="Metas"
        title={titulo}
        subtitle={`${metas.length} meta${metas.length === 1 ? "" : "s"} · progresso calculado agora`}
      />
      {metas.length === 0 ? (
        <div className="m-auto flex max-w-lg flex-col items-center text-center text-white/40">
          <Target className="mb-4 h-12 w-12" strokeWidth={1} />
          <p className="text-lg">
            {emptyMessage ?? "Nenhuma meta ativa no momento."}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metas.map((m, i) => (
            <MetaCardSlide key={m.id} meta={m} delay={0.05 * i} />
          ))}
        </div>
      )}
    </>
  );
}

function MetaCardSlide({
  meta,
  delay,
}: {
  meta: MetaComProgresso;
  delay: number;
}) {
  const isTaxa = meta.metrica === "taxa_finalizacao";
  const pctLimitado = Math.min(100, meta.percentualAtingido);
  const cor = FAROL_TONE[meta.farol];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: meta.alvoCorTema ?? cor }}
      />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
        {META_ESCOPO_LABEL[meta.escopo]} · {meta.periodoLabel}
      </p>
      <h3 className="mt-0.5 truncate text-xl font-semibold">
        {meta.alvoNome ?? "—"}
      </h3>
      <p className="text-xs text-white/50">{META_METRICA_LABEL[meta.metrica]}</p>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tabular-nums">
          {isTaxa
            ? `${meta.realizado.toFixed(1)}%`
            : Math.round(meta.realizado).toLocaleString("pt-BR")}
        </span>
        <span className="text-sm text-white/40">
          / {isTaxa ? `${meta.valorAlvo}%` : meta.valorAlvo.toLocaleString("pt-BR")}
        </span>
        <span
          className="ml-auto text-lg font-semibold tabular-nums"
          style={{ color: cor }}
        >
          {meta.percentualAtingido.toFixed(0)}%
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctLimitado}%` }}
          transition={{ ...spring.gentle, delay: delay + 0.15 }}
          className="h-full rounded-full"
          style={{ backgroundColor: cor }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
        <span>
          {meta.percentualTempo.toFixed(0)}% do período ·{" "}
          {meta.diasRestantes === 0
            ? "encerra hoje"
            : `${meta.diasRestantes}d restante${meta.diasRestantes === 1 ? "" : "s"}`}
        </span>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   Slide 6 · Próximos eventos
   ========================================================================== */

function EventosSlide({ eventos }: { eventos: EventoSlide[] }) {
  // Agrupa por dia (data local)
  const porDia = new Map<string, EventoSlide[]>();
  for (const e of eventos) {
    const d = new Date(e.inicioIso);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!porDia.has(key)) porDia.set(key, []);
    porDia.get(key)!.push(e);
  }

  return (
    <>
      <SlideHeader
        eyebrow="Agenda"
        title="Próximos eventos"
        subtitle={
          eventos.length === 0
            ? "Nenhum evento cadastrado"
            : `${eventos.length} evento${eventos.length === 1 ? "" : "s"} no horizonte`
        }
      />
      {eventos.length === 0 ? (
        <div className="m-auto flex max-w-lg flex-col items-center text-center text-white/40">
          <Calendar className="mb-4 h-12 w-12" strokeWidth={1} />
          <p className="text-lg">
            Nenhum evento nos próximos dias. Cadastre no menu Eventos.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(porDia.entries()).slice(0, 6).map(([k, lista], i) => {
            const d = new Date(k);
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.05 * i }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <div className="mb-3 flex items-baseline gap-3 border-b border-white/10 pb-3">
                  <span className="text-4xl font-semibold tabular-nums">
                    {d.getDate()}
                  </span>
                  <div>
                    <div className="text-sm font-medium capitalize">
                      {DIA_SEMANA[d.getDay()]}
                    </div>
                    <div className="text-[11px] uppercase tracking-widest text-white/40">
                      {MES_ABBR[d.getMonth()]} · {d.getFullYear()}
                    </div>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {lista.map((e) => {
                    const ini = new Date(e.inicioIso);
                    return (
                      <li key={e.id} className="flex items-start gap-2">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: TIPO_EVENTO_COR[e.tipo] }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{e.titulo}</div>
                          <div className="text-[11px] text-white/40">
                            {e.diaInteiro
                              ? "dia inteiro"
                              : `${String(ini.getHours()).padStart(2, "0")}:${String(ini.getMinutes()).padStart(2, "0")}`}
                            {" · "}
                            {TIPO_EVENTO_LABEL[e.tipo]}
                            {e.local && ` · ${e.local}`}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ==========================================================================
   Header comum dos slides
   ========================================================================== */

function SlideHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
        className="text-xs uppercase tracking-[0.25em] text-white/40"
      >
        {eyebrow}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.05 }}
        className="mt-2 text-4xl font-semibold tracking-tight lg:text-5xl"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.1 }}
          className="mt-2 text-white/60"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

