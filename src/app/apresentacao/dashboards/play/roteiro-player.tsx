"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LayoutList, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { ApresentacaoModulo } from "@/lib/apresentacao/registry";

/**
 * Roteiro em modo apresentação encadeada. Cada módulo aparece:
 *   1. Capa (cor tema + nome + descrição breve)  — 3s auto-avança OU seta →
 *   2. Iframe do dashboard "modo apresentação"    — usuário navega os slides
 *      dentro do iframe; ao chegar no fim, seta → avança para próxima capa.
 *
 * Iframe é escolha deliberada: reusa 100% da lógica de cada dashboard sem
 * duplicar `<SlideDeck>` shells. Trade-off: navegação por teclado só funciona
 * se o iframe tiver foco. Compensamos com botões fixos no topo (Anterior /
 * Próximo módulo, sair). Setas ← → no shell fora do iframe também funcionam.
 */

type Fase = "capa" | "conteudo";

export function RoteiroPlayer({ roteiro }: { roteiro: ApresentacaoModulo[] }) {
  const [idx, setIdx] = useState(0);
  const [fase, setFase] = useState<Fase>("capa");

  const atual = roteiro[idx];
  const proximo = roteiro[idx + 1];
  const anterior = roteiro[idx - 1];

  // Auto-avança da capa pro conteúdo depois de 2.5s (padrão de apresentação).
  useEffect(() => {
    if (fase !== "capa") return;
    const t = setTimeout(() => setFase("conteudo"), 2500);
    return () => clearTimeout(t);
  }, [fase, idx]);

  const irProximo = () => {
    if (fase === "capa") {
      setFase("conteudo");
      return;
    }
    if (proximo) {
      setIdx(idx + 1);
      setFase("capa");
    }
  };

  const irAnterior = () => {
    if (fase === "conteudo") {
      setFase("capa");
      return;
    }
    if (anterior) {
      setIdx(idx - 1);
      setFase("conteudo");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        irProximo();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        irAnterior();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, idx]);

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white">
      {/* Barra superior fixa com controles e progresso */}
      <div className="flex items-center justify-between border-b border-white/10 bg-neutral-950/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/apresentacao/dashboards"
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 hover:text-white"
            aria-label="Sair"
          >
            <X className="h-3 w-3" strokeWidth={2} />
            Sair
          </Link>
          <Link
            href="/apresentacao/dashboards"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/50 hover:text-white/90"
          >
            <LayoutList className="h-3 w-3" strokeWidth={2} />
            Editar roteiro
          </Link>
        </div>

        {/* Trilha de progresso — um dot por módulo */}
        <div className="flex items-center gap-1.5">
          {roteiro.map((m, i) => {
            const ativo = i === idx;
            const feito = i < idx;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setIdx(i);
                  setFase("capa");
                }}
                className="group flex items-center gap-1"
                title={m.nome}
              >
                <span
                  className={`h-1.5 rounded-full transition-all ${
                    ativo ? "w-8" : "w-1.5"
                  }`}
                  style={{
                    backgroundColor: ativo
                      ? m.cor
                      : feito
                        ? "rgba(255,255,255,0.35)"
                        : "rgba(255,255,255,0.12)",
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={irAnterior}
            disabled={idx === 0 && fase === "capa"}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            Anterior
          </button>
          <button
            onClick={irProximo}
            disabled={idx === roteiro.length - 1 && fase === "conteudo"}
            className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1 text-[11px] font-semibold text-neutral-950 hover:opacity-90 disabled:opacity-30"
          >
            {fase === "capa" ? "Entrar" : proximo ? "Próximo" : "Fim"}
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Conteúdo — capa ou iframe */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {fase === "capa" ? (
            <motion.div
              key={`capa-${atual.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${atual.cor}22 0%, transparent 60%)`,
              }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                  className="mb-6 text-6xl"
                >
                  {atual.icone}
                </motion.div>
                <p
                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: atual.cor }}
                >
                  {idx + 1} de {roteiro.length}
                </p>
                <h1 className="text-5xl font-semibold tracking-tight">
                  {atual.nome}
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-sm text-white/60">
                  {atual.descricao}
                </p>
                <p className="mt-8 text-[10px] uppercase tracking-widest text-white/30">
                  Iniciando em instantes — pressione → para começar
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.iframe
              key={`iframe-${atual.id}`}
              src={atual.href}
              title={atual.nome}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 h-full w-full border-0 bg-white dark:bg-neutral-950"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
