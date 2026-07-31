"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import { fadeSlideUp, spring, staggerContainer } from "@/lib/design/motion";

/**
 * SlideDeck — modo apresentação em tela cheia para os dashboards do
 * Monitoramento Externo. Abrir o dashboard já ocupa toda a viewport
 * (`fixed inset-0`), sem o shell do app nem margens laterais: cada `Slide`
 * é uma tela que "encaixa" via CSS scroll-snap (1 slide por tela), com um
 * rail lateral retrátil (ícones ↔ rótulos) e navegação por teclado.
 *
 * Uso:
 *   <SlideDeck
 *     backHref="/monitoramento/mapbiomas"
 *     toc={TOC} corTema="#F59E0B" tituloModulo="MapBiomas"
 *     title={<>Alertas MapBiomas — 2025</>}
 *     headerControls={<AnoDropdown … />}
 *   >
 *     <Slide id="visao" title="Visão executiva" corTema="#F59E0B" total={6} index={1}>…</Slide>
 *   </SlideDeck>
 */

interface DeckCtx {
  register: (id: string, ref: HTMLElement) => void;
  activeId: string | null;
}
const DeckContext = createContext<DeckCtx | null>(null);

interface SlideDeckProps {
  children: React.ReactNode;
  backHref: string;
  /** Slides na ordem — usado no rail lateral de navegação. */
  toc: Array<{ id: string; label: string }>;
  corTema: string;
  tituloModulo: string;
  /** Título grande da apresentação (ex.: "Alertas MapBiomas — 2025"). */
  title?: React.ReactNode;
  /** Controles à direita da barra superior (ex.: seletor de ano). */
  headerControls?: React.ReactNode;
}

export function SlideDeck({
  children,
  backHref,
  toc,
  corTema,
  tituloModulo,
  title,
  headerControls,
}: SlideDeckProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const slides = useRef(new Map<string, HTMLElement>());
  const [activeId, setActiveId] = useState<string | null>(toc[0]?.id ?? null);
  const [railOpen, setRailOpen] = useState(true);

  const register = (id: string, ref: HTMLElement) => {
    slides.current.set(id, ref);
  };

  // Rail começa recolhido em telas estreitas (mais espaço para o conteúdo).
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setRailOpen(false);
    }
  }, []);

  // Slide ativo = o mais visível dentro do container de scroll (não a janela,
  // porque o scroll acontece dentro do overlay `fixed`).
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.getAttribute("data-slide-id");
          if (id) setActiveId(id);
        }
      },
      { root, threshold: [0.35, 0.55, 0.75] },
    );
    for (const [, el] of slides.current) observer.observe(el);
    return () => observer.disconnect();
  }, [toc.length]);

  const goTo = (id: string) => {
    slides.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeIdx = toc.findIndex((t) => t.id === activeId);
  const prev = toc[activeIdx - 1];
  const next = toc[activeIdx + 1];

  // Teclado: ↑/↓ e PageUp/PageDown navegam entre slides; Esc sai.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "ArrowDown" || e.key === "PageDown") && next) {
        e.preventDefault();
        goTo(next.id);
      } else if ((e.key === "ArrowUp" || e.key === "PageUp") && prev) {
        e.preventDefault();
        goTo(prev.id);
      } else if (e.key === "Escape") {
        router.push(backHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, next?.id, prev?.id, backHref]);

  return (
    <DeckContext.Provider value={{ register, activeId }}>
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] text-[var(--text)]">
        {/* Barra superior — sair · módulo · título · controles */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 md:px-5">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">Aparato geral</span>
          </Link>

          <div className="ml-1 flex min-w-0 flex-col justify-center">
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: corTema }}
            >
              {tituloModulo}
            </span>
            {title && (
              <h1 className="truncate text-sm font-semibold leading-tight tracking-tight md:text-base">
                {title}
              </h1>
            )}
          </div>

          {headerControls && (
            <div className="ml-auto flex items-center gap-2">{headerControls}</div>
          )}
        </header>

        {/* Corpo — rail retrátil + área de slides com scroll-snap */}
        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "flex shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface)]/40 p-2 transition-[width] duration-200",
              railOpen ? "w-56" : "w-[52px]",
            )}
          >
            <button
              onClick={() => setRailOpen((v) => !v)}
              className="mb-1 inline-flex h-8 w-8 items-center justify-center self-start rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--elevated)] hover:text-[var(--text)]"
              aria-label={railOpen ? "Recolher menu" : "Expandir menu"}
              title={railOpen ? "Recolher menu" : "Expandir menu"}
            >
              {railOpen ? (
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              ) : (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
              )}
            </button>

            <nav className="flex flex-col gap-0.5">
              {toc.map((t, i) => {
                const ativo = activeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => goTo(t.id)}
                    title={t.label}
                    aria-current={ativo ? "true" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md py-1.5 text-left transition-colors",
                      railOpen ? "px-2" : "justify-center px-0",
                      ativo
                        ? "bg-[var(--elevated)] text-[var(--text)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--elevated)]/60 hover:text-[var(--text)]",
                    )}
                  >
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums transition-colors"
                      style={
                        ativo
                          ? { backgroundColor: corTema, color: "#fff" }
                          : {
                              backgroundColor: "var(--elevated)",
                              color: "var(--text-subtle)",
                            }
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {railOpen && (
                      <span className="truncate text-[12px]">{t.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Área de slides — 1 por tela, encaixe vertical */}
          <div
            ref={scrollRef}
            className="relative min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth"
          >
            {children}

            {/* Navegação flutuante — sobe / desce */}
            <div className="pointer-events-none fixed bottom-6 right-6 z-10 flex flex-col gap-2">
              <NavBtn
                onClick={() => prev && goTo(prev.id)}
                disabled={!prev}
                label="Slide anterior"
              >
                <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
              </NavBtn>
              <NavBtn
                onClick={() => next && goTo(next.id)}
                disabled={!next}
                label="Próximo slide"
              >
                <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
              </NavBtn>
            </div>
          </div>
        </div>
      </div>
    </DeckContext.Provider>
  );
}

function NavBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--elevated)] text-[var(--text-muted)] shadow-[var(--shadow-md)] transition-colors hover:text-[var(--text)] disabled:cursor-default disabled:opacity-30"
    >
      {children}
    </button>
  );
}

interface SlideProps {
  id: string;
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  corTema: string;
  children: React.ReactNode;
  /** Se true, alinha o conteúdo ao topo (slides longos: tabelas, rankings). */
  fluid?: boolean;
}

export function Slide({
  id,
  index,
  total,
  title,
  subtitle,
  corTema,
  children,
  fluid = false,
}: SlideProps) {
  const ctx = useContext(DeckContext);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (ref.current && ctx) ctx.register(id, ref.current);
  }, [id, ctx]);

  const variants = useMemo(
    () =>
      reduce
        ? undefined
        : { hidden: fadeSlideUp.hidden, visible: fadeSlideUp.visible },
    [reduce],
  );

  return (
    <motion.section
      ref={ref}
      data-slide-id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      variants={staggerContainer}
      transition={spring.gentle}
      className={cn(
        // min-h-full = ocupa a tela toda dentro do container de scroll; snap-start
        // encaixa o topo do slide ao rolar. Slides curtos ficam centrados
        // verticalmente; os `fluid` (longos) alinham ao topo para não cortar.
        "flex min-h-full w-full snap-start flex-col px-4 py-8 sm:px-6 md:px-10 lg:px-14",
        fluid ? "justify-start" : "justify-center",
      )}
    >
      <div className="mx-auto w-full max-w-[1700px]">
        {/* Header do slide */}
        <motion.header
          variants={variants}
          className="mb-5 flex items-baseline gap-3 border-b border-[var(--border)] pb-3"
        >
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums tracking-wider"
            style={{ backgroundColor: `${corTema}20`, color: corTema }}
          >
            {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight text-[var(--text)] md:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
        </motion.header>

        {/* Conteúdo do slide */}
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </motion.section>
  );
}

export { fadeSlideUp };
