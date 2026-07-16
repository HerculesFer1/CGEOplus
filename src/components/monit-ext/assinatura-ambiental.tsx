"use client";

import { motion } from "framer-motion";
import { ArrowRight, Fingerprint, TreePine, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { fadeSlideUp } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

interface Props {
  corTema: string;
  /** Lista de nomes de município candidatos ao painel — vem do top do dashboard. */
  municipios: string[];
}

/**
 * "Assinatura Ambiental do Município" — melhoria CGEO+ que NÃO existe no
 * dashboard original. Perfil unificado por município cruzando as 3 fontes
 * externas + módulos internos do CGEO+ (CAR, atividades, servidores).
 *
 * Nesta primeira versão: seletor de município + 3 links para o material já
 * disponível internamente. A visão detalhada com dados agregados por
 * município fica como incremento na fase 2 — quando o schema do CGEO+ tiver
 * chave estável de município (código IBGE) em atividades/servidores.
 */
export function AssinaturaAmbientalCard({ corTema, municipios }: Props) {
  const [ativo, setAtivo] = useState<string | null>(municipios[0] ?? null);

  if (municipios.length === 0) return null;

  return (
    <motion.div variants={fadeSlideUp}>
      <div className="mb-2 flex items-baseline gap-2">
        <Fingerprint className="h-4 w-4" style={{ color: corTema }} strokeWidth={2} />
        <h4 className="text-sm font-semibold text-[var(--text)]">
          Assinatura Ambiental do Município
        </h4>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-subtle)]">
          leitura CGEO+
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Perfil unificado: cruza as 3 fontes externas (MapBiomas · PRODES · Queimadas)
        com o que o CGEO+ já sabe (CAR, atividades da equipe, servidores responsáveis).
      </p>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span>Município</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {municipios.map((m) => (
            <button
              key={m}
              onClick={() => setAtivo(m)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] transition-colors",
                ativo === m
                  ? "border-transparent text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
              style={ativo === m ? { backgroundColor: `${corTema}25`, borderColor: `${corTema}55` } : undefined}
            >
              {m}
            </button>
          ))}
        </div>

        {ativo && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PerfilLink
              href={`/monitoramento/processos?municipio=${encodeURIComponent(ativo)}`}
              titulo="Processos"
              subtitulo="SEI · SIGA · SICAR"
              Icon={Fingerprint}
              cor={corTema}
            />
            <PerfilLink
              href={`/car?municipio=${encodeURIComponent(ativo)}`}
              titulo="Painel CAR"
              subtitulo="Passivo do CAR"
              Icon={TreePine}
              cor={corTema}
            />
            <PerfilLink
              href={`/atividades?municipio=${encodeURIComponent(ativo)}`}
              titulo="Equipe alocada"
              subtitulo="Servidores · núcleos"
              Icon={Users}
              cor={corTema}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PerfilLink({
  href,
  titulo,
  subtitulo,
  Icon,
  cor,
}: {
  href: string;
  titulo: string;
  subtitulo: string;
  Icon: typeof Fingerprint;
  cor: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--elevated)] p-3 transition-colors hover:border-[var(--text-muted)]"
    >
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${cor}20`, color: cor }}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[var(--text)]">{titulo}</div>
        <div className="truncate text-[10px] text-[var(--text-muted)]">{subtitulo}</div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-[var(--text-subtle)] group-hover:text-[var(--text)]" strokeWidth={2} />
    </Link>
  );
}
