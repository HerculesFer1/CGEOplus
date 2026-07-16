"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { fadeSlideUp, spring, staggerContainer } from "@/lib/design/motion";

/**
 * SlideDeck — infraestrutura de storytelling em slides para os dashboards
 * do Monitoramento Externo. Cada `Slide` é uma tela verticalmente snappada
 * dentro do container, com entrada em stagger controlada pelo Framer Motion.
 *
 * Uso:
 *   <SlideDeck backHref="/monitoramento/mapbiomas">
 *     <Slide id="visao" title="Visão executiva" corTema="#F59E0B" total={5} index={1}>
 *       ...
 *     </Slide>
 *     <Slide id="temporal" ...>...</Slide>
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
}

export function SlideDeck({ children, backHref, toc, corTema, tituloModulo }: SlideDeckProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slides = useRef(new Map<string, HTMLElement>());
  const [activeId, setActiveId] = useState<string | null>(toc[0]?.id ?? null);

  const register = (id: string, ref: HTMLElement) => {
    slides.current.set(id, ref);
  };

  useEffect(() => {
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
      { threshold: [0.4, 0.6, 0.8], rootMargin: "-10% 0px" },
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

  return (
    <DeckContext.Provider value={{ register, activeId }}>
      <div className="relative flex gap-6">
        {/* Rail lateral — TOC compacta com dot indicator */}
        <aside className="sticky top-24 hidden h-fit shrink-0 space-y-0.5 lg:block">
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2} /> Aparato geral
          </Link>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            {tituloModulo}
          </p>
          {toc.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goTo(t.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                activeId === t.id
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full transition-all",
                  activeId === t.id ? "w-3" : "bg-[var(--border)]",
                )}
                style={activeId === t.id ? { backgroundColor: corTema } : undefined}
              />
              <span className="truncate">
                <span className="text-[10px] tabular-nums text-[var(--text-subtle)]">
                  {String(i + 1).padStart(2, "0")}
                </span>{" "}
                {t.label}
              </span>
            </button>
          ))}
        </aside>

        {/* Deck vertical com scroll snap */}
        <div ref={containerRef} className="min-w-0 flex-1">
          {children}

          {/* Navegação flutuante — anterior/próximo */}
          <div className="pointer-events-none sticky bottom-6 z-10 mt-4 flex justify-end gap-2 pr-2">
            {prev && (
              <NavPill onClick={() => goTo(prev.id)} corTema={corTema} direction="prev">
                {prev.label}
              </NavPill>
            )}
            {next && (
              <NavPill onClick={() => goTo(next.id)} corTema={corTema} direction="next">
                {next.label}
              </NavPill>
            )}
          </div>
        </div>
      </div>
    </DeckContext.Provider>
  );
}

function NavPill({
  children,
  onClick,
  corTema,
  direction,
}: {
  children: React.ReactNode;
  onClick: () => void;
  corTema: string;
  direction: "prev" | "next";
}) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border bg-[var(--elevated)] px-3 py-1.5 text-[11px] shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--surface)]"
    >
      {direction === "prev" && <ChevronLeft className="h-3 w-3" strokeWidth={2} />}
      <span className="text-[var(--text-muted)]">{direction === "prev" ? "Anterior" : "Próximo"}</span>
      <span className="font-medium" style={{ color: corTema }}>
        {children}
      </span>
      {direction === "next" && <ChevronRight className="h-3 w-3" strokeWidth={2} />}
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
  /** Se true, o slide não força altura mínima da viewport — útil para tabelas longas. */
  fluid?: boolean;
}

export function Slide({ id, index, total, title, subtitle, corTema, children, fluid = false }: SlideProps) {
  const ctx = useContext(DeckContext);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (ref.current && ctx) ctx.register(id, ref.current);
  }, [id, ctx]);

  const variants = useMemo(
    () => (reduce ? undefined : { hidden: fadeSlideUp.hidden, visible: fadeSlideUp.visible }),
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
        "mb-8 flex flex-col rounded-3xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)] lg:p-7",
        // Não forçamos mais altura mínima da viewport — cria "buraco vazio" em
        // slides curtos. Deixamos o conteúdo ditar a altura; a navegação por
        // scroll snap continua funcionando via IntersectionObserver.
      )}
    >
      {/* Header do slide */}
      <motion.header variants={variants} className="mb-5 flex items-baseline gap-3 border-b border-[var(--border)] pb-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums tracking-wider"
          style={{ backgroundColor: `${corTema}20`, color: corTema }}
        >
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight text-[var(--text)] lg:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
      </motion.header>

      {/* Conteúdo — altura natural, sem "esticar" para preencher tela cheia.
       * Stagger para os filhos diretos que expuserem `variants={fadeSlideUp}`. */}
      <div className="flex flex-col space-y-5">{children}</div>
    </motion.section>
  );
}

export { fadeSlideUp };
