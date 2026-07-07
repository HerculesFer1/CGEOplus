"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, Layers, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";

import { NucleoFormDialog } from "./nucleo-form-dialog";
import { toggleNucleoAtivoAction } from "./actions";

export interface NucleoRow {
  id: string;
  nome: string;
  descricao: string | null;
  corTema: string | null;
  minMembros: number;
  ativo: boolean;
  membrosAtivos: number;
}

export interface ServidorOption {
  id: string;
  nome: string;
  apelido: string;
  /** Nome do núcleo principal atual, ou null se sem vínculo. */
  nucleoAtual: string | null;
  /** ID do núcleo atual, usado internamente pra reconciliação. */
  nucleoAtualId: string | null;
}

interface Props {
  nucleos: NucleoRow[];
  servidores: ServidorOption[];
}

export function NucleosView({ nucleos, servidores }: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<NucleoRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const ativos = nucleos.filter((n) => n.ativo);
  const total = ativos.length;
  const abaixoMin = ativos.filter((n) => n.membrosAtivos < n.minMembros).length;

  const membrosAtuaisIds = useMemo(() => {
    if (!editing) return [];
    return servidores
      .filter((s) => s.nucleoAtualId === editing.id)
      .map((s) => s.id);
  }, [editing, servidores]);

  function handleNew() {
    setEditing(null);
    setOpenForm(true);
  }

  function handleEdit(n: NucleoRow) {
    setEditing(n);
    setOpenForm(true);
  }

  function handleToggle(n: NucleoRow) {
    startTransition(async () => {
      const res = await toggleNucleoAtivoAction(n.id);
      if (res.ok) {
        toast.success(
          n.ativo ? `${n.nome} desativado.` : `${n.nome} reativado.`,
        );
      } else {
        toast.error(res.error);
      }
    });
  }

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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Núcleos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {total} núcleos ativos · {abaixoMin} operando abaixo do mínimo
            funcional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/nucleos/remanejamento">
              <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} />
              Remanejar equipe
            </Link>
          </Button>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Novo núcleo
          </Button>
        </div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {nucleos.map((n) => (
          <motion.div
            key={n.id}
            variants={fadeSlideUp}
            whileHover={{ y: -2 }}
            transition={spring.gentle}
            className={`rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)] ${n.ativo ? "" : "opacity-60"}`}
          >
            <div className="flex items-start justify-between">
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: n.corTema ?? "#8E8E93" }}
              >
                <Layers className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex items-center gap-2">
                {!n.ativo && <Badge variant="outline">inativo</Badge>}
                {n.ativo && n.membrosAtivos < n.minMembros && (
                  <Badge variant="danger">
                    <AlertTriangle className="h-3 w-3" />
                    crítico
                  </Badge>
                )}
              </div>
            </div>

            <h3 className="mt-4 text-lg font-semibold">{n.nome}</h3>
            {n.descricao && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {n.descricao}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniStat label="Membros ativos" value={n.membrosAtivos} />
              <MiniStat label="Mínimo funcional" value={n.minMembros} />
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => handleEdit(n)}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggle(n)}
                disabled={isPending}
                aria-label={n.ativo ? "Desativar núcleo" : "Reativar núcleo"}
                title={n.ativo ? "Desativar núcleo" : "Reativar núcleo"}
              >
                <Power className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <NucleoFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        nucleo={editing}
        servidores={servidores}
        membrosAtuaisIds={membrosAtuaisIds}
      />
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-[var(--surface)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
