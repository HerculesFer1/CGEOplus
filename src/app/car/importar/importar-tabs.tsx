"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileSpreadsheet, Trophy } from "lucide-react";

import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { ImportarCarView } from "./importar-view";
import { ImportarRankingView } from "./ranking/importar-ranking-view";

type Aba = "mensal" | "ranking";

interface Props {
  anoDefault: number;
  mesDefault: number;
  abaDefault?: Aba;
}

export function ImportarTabs({
  anoDefault,
  mesDefault,
  abaDefault = "mensal",
}: Props) {
  const [aba, setAba] = useState<Aba>(abaDefault);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      <motion.div variants={fadeSlideUp}>
        <Link
          href="/car"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel CAR
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Importar dados do SICAR
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Escolha o tipo de importação. O relatório mensal alimenta o funil de
          análise e a camada municipal; o ranking nacional alimenta o
          benchmarking (posicionamento do Piauí no Brasil e no Nordeste).
        </p>
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <div
          role="tablist"
          aria-label="Tipo de importação"
          className="inline-flex rounded-xl border bg-[var(--elevated)] p-1 shadow-[var(--shadow-sm)]"
        >
          <TabButton
            active={aba === "mensal"}
            onClick={() => setAba("mensal")}
            icon={<FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />}
            label="Relatório mensal"
            sub="CSV do SICAR"
          />
          <TabButton
            active={aba === "ranking"}
            onClick={() => setAba("ranking")}
            icon={<Trophy className="h-4 w-4" strokeWidth={1.75} />}
            label="Ranking nacional"
            sub="Planilha UF · Total"
          />
        </div>
      </motion.div>

      <div role="tabpanel">
        {aba === "mensal" ? (
          <ImportarCarView
            anoDefault={anoDefault}
            mesDefault={mesDefault}
            hideHeader
          />
        ) : (
          <ImportarRankingView
            anoDefault={anoDefault}
            mesDefault={mesDefault}
            hideHeader
          />
        )}
      </div>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
        active
          ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      <span
        className={active ? "text-[#FF9F0A]" : "text-[var(--text-muted)]"}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-[10px] uppercase tracking-wide">{sub}</span>
      </span>
    </button>
  );
}
