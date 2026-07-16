"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, GripVertical, Play, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { ApresentacaoModulo } from "@/lib/apresentacao/registry";

/**
 * Montador de roteiro — o usuário clica nos módulos para incluir em ordem,
 * pode remover ou reordenar, e clica "Iniciar apresentação" para entrar no
 * shell fullscreen encadeado. Roteiro é serializado na URL (query
 * `?modulos=queimadas,car,mapbiomas`), então dá pra compartilhar link.
 */
export function RoteiroMontador({ modulos }: { modulos: ApresentacaoModulo[] }) {
  const router = useRouter();
  const [roteiro, setRoteiro] = useState<string[]>([]);

  const inRoteiro = useMemo(() => new Set(roteiro), [roteiro]);

  const toggle = (id: string) => {
    setRoteiro((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const remover = (id: string) => setRoteiro((prev) => prev.filter((x) => x !== id));

  const mover = (idx: number, delta: number) => {
    setRoteiro((prev) => {
      const arr = [...prev];
      const to = idx + delta;
      if (to < 0 || to >= arr.length) return prev;
      [arr[idx], arr[to]] = [arr[to], arr[idx]];
      return arr;
    });
  };

  const iniciar = () => {
    if (roteiro.length === 0) return;
    router.push(`/apresentacao/dashboards/play?modulos=${roteiro.join(",")}`);
  };

  const modulosOrdenados = roteiro
    .map((id) => modulos.find((m) => m.id === id))
    .filter((m): m is ApresentacaoModulo => m !== undefined);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/apresentacao"
            className="inline-flex items-center gap-1 text-[12px] text-white/60 hover:text-white/90"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Voltar para apresentação semanal
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Roteiro de dashboards
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            Escolha os módulos que vão compor sua apresentação. Cada um roda
            os próprios slides em sequência, com uma capa de transição entre
            eles. O roteiro fica no link — dá pra compartilhar depois.
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Coluna 1 — catálogo */}
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Módulos disponíveis
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {modulos.map((m) => {
              const on = inRoteiro.has(m.id);
              return (
                <motion.button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                    on
                      ? "border-white/30 bg-white/[0.06]"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                  style={{
                    boxShadow: on ? `inset 4px 0 0 0 ${m.cor}` : undefined,
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-0.5"
                    style={{ backgroundColor: m.cor }}
                  />
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{m.icone}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-white">{m.nome}</h3>
                      <p className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-white/60">
                        {m.descricao}
                      </p>
                      <p className="mt-2 text-[10.5px] text-white/40">
                        ~{m.slidesAproximado} slides
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        on
                          ? "text-white"
                          : "text-white/50"
                      }`}
                      style={{
                        backgroundColor: on ? m.cor : "transparent",
                        border: on ? "none" : "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      {on
                        ? `#${roteiro.indexOf(m.id) + 1} no roteiro`
                        : "Adicionar"}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Coluna 2 — roteiro montado */}
        <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Seu roteiro
            </p>
            <p className="text-[11px] tabular-nums text-white/40">
              {roteiro.length} {roteiro.length === 1 ? "módulo" : "módulos"}
            </p>
          </div>

          {modulosOrdenados.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-[12px] text-white/40">
              Clique num módulo à esquerda para adicionar. A ordem de clique
              vira a sequência da apresentação.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {modulosOrdenados.map((m, i) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: m.cor }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-white">
                    {i + 1}. {m.nome}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-30"
                      aria-label="Mover para cima"
                    >
                      <ArrowLeft className="h-3 w-3 rotate-90" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => mover(i, 1)}
                      disabled={i === modulosOrdenados.length - 1}
                      className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-30"
                      aria-label="Mover para baixo"
                    >
                      <ArrowRight className="h-3 w-3 rotate-90" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => remover(m.id)}
                      className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <button
            onClick={iniciar}
            disabled={roteiro.length === 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-neutral-950 shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Play className="h-4 w-4" strokeWidth={2.5} />
            Iniciar apresentação
          </button>

          <p className="mt-3 text-[10.5px] leading-relaxed text-white/40">
            Cada módulo abre no seu próprio deck em modo apresentação. Use
            ESC a qualquer momento para sair.
          </p>
        </aside>
      </div>
    </div>
  );
}
