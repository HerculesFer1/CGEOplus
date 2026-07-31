"use client";

import { motion } from "framer-motion";

import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

/**
 * Bento — enquadramento em grade dos dashboards do Monitoramento Externo.
 *
 * Preserva o modelo em `SlideDeck`/`Slide`; muda só o layout INTERNO do slide:
 * em vez de faixas de largura total empilhadas (`flex flex-col space-y-5`), os
 * blocos entram numa grade onde o tamanho da célula comunica a prioridade do
 * dado (célula âncora grande + células de apoio menores).
 *
 * Reflow: `grid-cols-1` na base (mobile → coluna única, na ordem do DOM =
 * ordem de importância) e o `className` define as colunas a partir de `lg`,
 * ex.: `lg:grid-cols-[1.35fr_1fr]` ou `lg:grid-cols-4`. Assim o bento nunca
 * espreme conteúdo em telas estreitas.
 *
 * O container é um `staggerContainer` do motion — herda o estado
 * `hidden`/`visible` do `Slide` pai e escalona a entrada das células. Cada
 * `BentoCell` é um `fadeSlideUp`; portanto o CONTEÚDO de uma célula deve ser
 * "cru" (sem seu próprio wrapper motion) para não animar em duplicidade.
 */
export function Bento({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      className={cn("grid grid-cols-1 gap-3", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * BentoCell — célula da grade. Fornece a entrada animada (`fadeSlideUp`) e o
 * `min-w-0` que impede conteúdo de min-content largo (tabelas, gráficos) de
 * estourar a coluna. Posição/tamanho vêm do `className` (ex.: `lg:col-span-2`,
 * `lg:row-span-2`), casando com as colunas definidas no `Bento` pai.
 */
export function BentoCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeSlideUp} className={cn("min-w-0", className)}>
      {children}
    </motion.div>
  );
}
