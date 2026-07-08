"use client";

import { motion } from "framer-motion";
import { Cake, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { spring } from "@/lib/design/motion";
import { cn } from "@/lib/utils";
import type { Servidor } from "@/lib/services/servidores.service";

import { daysUntilBirthday, displayVinculo } from "./vinculo-display";

interface Props {
  servidor: Servidor;
  onClick: () => void;
}

const VINCULO_VARIANT: Record<string, "accent" | "outline" | "default"> = {
  Efetivo: "accent",
  "Consultor PSI": "outline",
  "Consultor Pilares II": "outline",
  Terceirizado: "outline",
  Suporte: "default",
};

function initialsOf(nome: string, apelido: string) {
  const source = (nome || apelido || "").trim();
  if (!source) return "";
  const words = source.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function BirthdayStripe({ days }: { days: number }) {
  const isToday = days === 0;
  return (
    <div
      className={cn(
        "-mx-3 -mb-3 mt-2 flex items-center gap-1.5 rounded-b-2xl border-t px-3 py-1.5 text-xs font-medium",
        isToday
          ? "border-[#f59e0b40] bg-[#f59e0b1a] text-[#f59e0b]"
          : "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]",
      )}
    >
      <Cake className="h-3.5 w-3.5" strokeWidth={1.75} />
      {isToday
        ? "Parabéns — aniversário hoje!"
        : `Aniversário em ${days} ${days === 1 ? "dia" : "dias"}`}
    </div>
  );
}

export function ServidorMiniCard({ servidor, onClick }: Props) {
  const initials = initialsOf(servidor.nome, servidor.apelido);
  const cor = servidor.nucleoCorTema ?? undefined;
  const days = daysUntilBirthday(servidor.dataNascimento);
  const showBirthday = days !== null && days <= 5;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      aria-label={`Ver detalhes de ${servidor.nome}`}
      className={cn(
        "group flex w-full flex-col rounded-2xl border bg-[var(--elevated)] p-3 text-left",
        "shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
      )}
    >
      <div className="flex w-full items-center gap-3">
        {servidor.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={servidor.fotoUrl}
            alt=""
            className="h-[3.6rem] w-[3.6rem] flex-none rounded-full border object-cover"
          />
        ) : (
          <div
            className="flex h-[3.6rem] w-[3.6rem] flex-none items-center justify-center rounded-full text-base font-semibold"
            style={
              cor
                ? { backgroundColor: `${cor}26`, color: cor, border: `1px solid ${cor}55` }
                : undefined
            }
          >
            {initials || <User className="h-5 w-5" strokeWidth={1.5} />}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {servidor.apelido || servidor.nome}
            </p>
            {servidor.apelido && servidor.apelido !== servidor.nome && (
              <p className="truncate text-xs text-[var(--text-muted)]">
                {servidor.nome}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {servidor.formacao && (
              <span className="truncate rounded-full border px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                {servidor.formacao}
              </span>
            )}
            <Badge variant={VINCULO_VARIANT[servidor.tipoVinculo] ?? "default"}>
              {displayVinculo(servidor.tipoVinculo)}
            </Badge>
          </div>
        </div>
      </div>

      {showBirthday && <BirthdayStripe days={days!} />}
    </motion.button>
  );
}
