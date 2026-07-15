"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Target,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";
import { cn } from "@/lib/utils";
import type { MetaComProgresso } from "@/lib/services/metas.service";
import {
  META_ESCOPO_LABEL,
  META_METRICA_LABEL,
  type MetaPeriodo,
} from "@/lib/validators/meta";

import { MetaFormDialog } from "./meta-form-dialog";
import { deleteMetaAction } from "./actions";

interface NucleoOption {
  id: string;
  nome: string;
  corTema: string | null;
}
interface ServidorOption {
  id: string;
  nome: string;
  apelido: string | null;
}
interface AtividadeOption {
  id: string;
  nome: string;
}

type Filtro =
  | { periodo: "mensal"; ano: number; mes: number }
  | { periodo: "semanal"; ano: number; semanaIso: number };

interface Props {
  metas: MetaComProgresso[];
  filtro: Filtro;
  nucleos: NucleoOption[];
  servidores: ServidorOption[];
  atividades: AtividadeOption[];
}

const MES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const FAROL_TONE: Record<MetaComProgresso["farol"], string> = {
  verde: "var(--success)",
  amarelo: "var(--warning)",
  vermelho: "var(--danger)",
};

const FAROL_LABEL: Record<MetaComProgresso["farol"], string> = {
  verde: "No ritmo",
  amarelo: "Atrasada",
  vermelho: "Em risco",
};

export function MetasView({
  metas,
  filtro,
  nucleos,
  servidores,
  atividades,
}: Props) {
  const router = useRouter();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<MetaComProgresso | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const porFarol = useMemo(
    () =>
      metas.reduce(
        (acc, m) => {
          acc[m.farol]++;
          return acc;
        },
        { verde: 0, amarelo: 0, vermelho: 0 } as Record<
          MetaComProgresso["farol"],
          number
        >,
      ),
    [metas],
  );

  function navegarPeriodo(delta: -1 | 1) {
    if (filtro.periodo === "mensal") {
      const d = new Date(filtro.ano, filtro.mes - 1 + delta, 1);
      const params = new URLSearchParams({
        periodo: "mensal",
        ano: String(d.getFullYear()),
        mes: String(d.getMonth() + 1),
      });
      router.push(`/metas?${params}`);
    } else {
      const novaSemana = filtro.semanaIso + delta;
      let ano = filtro.ano;
      let semana = novaSemana;
      if (novaSemana < 1) {
        ano -= 1;
        semana = 52;
      } else if (novaSemana > 53) {
        ano += 1;
        semana = 1;
      }
      const params = new URLSearchParams({
        periodo: "semanal",
        ano: String(ano),
        semana: String(semana),
      });
      router.push(`/metas?${params}`);
    }
  }

  function trocarPeriodo(p: MetaPeriodo) {
    if (p === filtro.periodo) return;
    router.push(`/metas?periodo=${p}`);
  }

  function handleNew() {
    setEditing(null);
    setOpenForm(true);
  }

  function handleEdit(m: MetaComProgresso) {
    setEditing(m);
    setOpenForm(true);
  }

  function handleDelete(m: MetaComProgresso) {
    if (
      !confirm(
        `Remover meta de "${m.alvoNome}" (${META_METRICA_LABEL[m.metrica]})?`,
      )
    )
      return;
    startDelete(async () => {
      const res = await deleteMetaAction(m.id);
      if (res.ok) toast.success("Meta removida.");
      else toast.error(res.error);
    });
  }

  const periodoTitulo =
    filtro.periodo === "mensal"
      ? `${MES_NOMES[filtro.mes - 1]} · ${filtro.ano}`
      : `Semana ${filtro.semanaIso} · ${filtro.ano}`;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div
        variants={fadeSlideUp}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm text-[var(--text-muted)]">Gestão</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Metas</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {metas.length} meta{metas.length === 1 ? "" : "s"} no período · o
            progresso é calculado em tempo real contra as análises registradas.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Nova meta
        </Button>
      </motion.div>

      {/* Toolbar: seletor de período + navegação */}
      <motion.div
        variants={fadeSlideUp}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]"
      >
        <div className="inline-flex rounded-full border bg-[var(--surface)] p-0.5">
          {(["mensal", "semanal"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => trocarPeriodo(p)}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-sm transition-colors",
                filtro.periodo === p
                  ? "text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {filtro.periodo === p && (
                <motion.span
                  layoutId="periodo-pill"
                  transition={spring.snappy}
                  className="absolute inset-0 rounded-full bg-[var(--elevated)] shadow-[var(--shadow-sm)]"
                />
              )}
              <span className="relative">
                {p === "mensal" ? "Mensal" : "Semanal"}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navegarPeriodo(-1)}
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium">
            {periodoTitulo}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navegarPeriodo(1)}
            aria-label="Próximo período"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <FarolChip tone="verde" count={porFarol.verde} label="No ritmo" />
          <FarolChip tone="amarelo" count={porFarol.amarelo} label="Atrasadas" />
          <FarolChip tone="vermelho" count={porFarol.vermelho} label="Em risco" />
        </div>
      </motion.div>

      {/* Cards de metas */}
      {metas.length === 0 ? (
        <motion.div
          variants={fadeSlideUp}
          className="rounded-2xl border border-dashed p-12 text-center"
        >
          <Target
            className="mx-auto h-8 w-8 text-[var(--text-subtle)]"
            strokeWidth={1.25}
          />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Nenhuma meta cadastrada para {periodoTitulo.toLowerCase()}.
          </p>
          <Button
            onClick={handleNew}
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            Criar a primeira meta
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {metas.map((m) => (
            <MetaCard
              key={m.id}
              meta={m}
              onEdit={() => handleEdit(m)}
              onDelete={() => handleDelete(m)}
              disabled={isDeleting}
            />
          ))}
        </motion.div>
      )}

      <MetaFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        meta={editing}
        filtro={filtro}
        nucleos={nucleos}
        servidores={servidores}
        atividades={atividades}
      />
    </motion.div>
  );
}

function FarolChip({
  tone,
  count,
  label,
}: {
  tone: MetaComProgresso["farol"];
  count: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: FAROL_TONE[tone] }}
      />
      <span className="tabular-nums">
        {count} {label.toLowerCase()}
      </span>
    </span>
  );
}

function MetaCard({
  meta,
  onEdit,
  onDelete,
  disabled,
}: {
  meta: MetaComProgresso;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const isTaxa = meta.metrica === "taxa_finalizacao";
  const pctLimitado = Math.min(100, meta.percentualAtingido);
  const cor = meta.alvoCorTema || FAROL_TONE[meta.farol];

  return (
    <motion.div
      variants={fadeSlideUp}
      className="group relative overflow-hidden rounded-2xl border bg-[var(--elevated)] p-5 shadow-[var(--shadow-sm)]"
    >
      {/* Barra de cor lateral (identidade do alvo) */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: cor }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            {META_ESCOPO_LABEL[meta.escopo]}
          </p>
          <h3 className="mt-0.5 truncate text-base font-semibold">
            {meta.alvoNome ?? "—"}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {META_METRICA_LABEL[meta.metrica]} · {meta.periodoLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            aria-label="Editar meta"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Remover meta"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">
          {isTaxa
            ? `${meta.realizado.toFixed(1)}%`
            : Math.round(meta.realizado).toLocaleString("pt-BR")}
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          / {isTaxa ? `${meta.valorAlvo}%` : meta.valorAlvo.toLocaleString("pt-BR")}
        </span>
        <span
          className="ml-auto text-sm font-medium tabular-nums"
          style={{ color: FAROL_TONE[meta.farol] }}
        >
          {meta.percentualAtingido.toFixed(0)}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctLimitado}%` }}
          transition={spring.gentle}
          className="h-full rounded-full"
          style={{ backgroundColor: FAROL_TONE[meta.farol] }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: FAROL_TONE[meta.farol] }}
          />
          {FAROL_LABEL[meta.farol]}
          <span className="opacity-60">
            · {meta.percentualTempo.toFixed(0)}% do período
          </span>
        </span>
        <span>
          {meta.diasRestantes === 0
            ? "encerra hoje"
            : `${meta.diasRestantes}d restante${meta.diasRestantes === 1 ? "" : "s"}`}
        </span>
      </div>

      {meta.observacao && (
        <p className="mt-3 line-clamp-2 border-t pt-3 text-xs italic text-[var(--text-muted)]">
          “{meta.observacao}”
        </p>
      )}
    </motion.div>
  );
}
