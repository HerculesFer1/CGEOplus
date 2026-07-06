"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";

import { AtividadeFormDialog } from "./atividade-form-dialog";
import { toggleAtividadeAtivoAction } from "./actions";

export interface AtividadeRow {
  id: string;
  nome: string;
  complexidade: "N1" | "N2" | "N3";
  descricao: string | null;
  ativo: boolean;
  nucleoId: string | null;
  nucleoNome: string | null;
}

interface NucleoOption {
  id: string;
  nome: string;
}

const COMPLEX_VARIANT: Record<
  AtividadeRow["complexidade"],
  "success" | "warning" | "danger"
> = {
  N1: "success",
  N2: "warning",
  N3: "danger",
};

const COMPLEX_LABEL: Record<AtividadeRow["complexidade"], string> = {
  N1: "N1 · Baixa",
  N2: "N2 · Média",
  N3: "N3 · Alta",
};

const NUCLEO_VARIANT: Record<
  string,
  "accent" | "success" | "warning" | "danger" | "default"
> = {
  "Gerência": "accent",
  Licenciamento: "success",
  CAR: "warning",
  "Fiscalização": "danger",
  Administrativo: "default",
};

interface Props {
  atividades: AtividadeRow[];
  nucleos: NucleoOption[];
}

export function AtividadesView({ atividades, nucleos }: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AtividadeRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const ativas = atividades.filter((a) => a.ativo);
  const porComplex = ativas.reduce(
    (acc, a) => {
      acc[a.complexidade]++;
      return acc;
    },
    { N1: 0, N2: 0, N3: 0 } as Record<AtividadeRow["complexidade"], number>,
  );
  const totalN3Pct =
    ativas.length > 0 ? (porComplex.N3 / ativas.length) * 100 : 0;

  function handleNew() {
    setEditing(null);
    setOpenForm(true);
  }

  function handleEdit(a: AtividadeRow) {
    setEditing(a);
    setOpenForm(true);
  }

  function handleToggle(a: AtividadeRow) {
    startTransition(async () => {
      const res = await toggleAtividadeAtivoAction(a.id);
      if (res.ok) {
        toast.success(
          a.ativo ? `${a.nome} desativada.` : `${a.nome} reativada.`,
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Atividades
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {ativas.length} atividades ativas · {totalN3Pct.toFixed(0)}% de alta
            complexidade (N3).
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Nova atividade
        </Button>
      </motion.div>

      <motion.div variants={staggerContainer} className="grid gap-4 md:grid-cols-3">
        <StatCard variants={fadeSlideUp} label="Baixa (N1)" value={porComplex.N1} tone="var(--success)" />
        <StatCard variants={fadeSlideUp} label="Média (N2)" value={porComplex.N2} tone="var(--warning)" />
        <StatCard variants={fadeSlideUp} label="Alta (N3)" value={porComplex.N3} tone="var(--danger)" />
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atividade</TableHead>
              <TableHead>Complexidade</TableHead>
              <TableHead>Núcleo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atividades.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={5}>
                  Nenhuma atividade cadastrada.
                </TableEmpty>
              </TableRow>
            ) : (
              atividades.map((a) => (
                <TableRow key={a.id} className={a.ativo ? "" : "opacity-60"}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {a.nome}
                      {!a.ativo && (
                        <Badge variant="outline" className="text-[10px]">
                          inativa
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={COMPLEX_VARIANT[a.complexidade]}>
                      {COMPLEX_LABEL[a.complexidade]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.nucleoNome && (
                      <Badge variant={NUCLEO_VARIANT[a.nucleoNome] ?? "default"}>
                        {a.nucleoNome}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)] max-w-md truncate">
                    {a.descricao ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(a)}
                        aria-label={`Editar ${a.nome}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggle(a)}
                        disabled={isPending}
                        aria-label={
                          a.ativo ? `Desativar ${a.nome}` : `Reativar ${a.nome}`
                        }
                      >
                        <Power className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>

      <AtividadeFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        atividade={editing}
        nucleos={nucleos}
      />
    </motion.div>
  );
}

function StatCard({
  variants,
  label,
  value,
  tone,
}: {
  variants: typeof fadeSlideUp;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <motion.div
      variants={variants}
      className="rounded-2xl border bg-[var(--elevated)] p-5 shadow-[var(--shadow-sm)]"
    >
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ color: tone }}
        >
          {value}
        </span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: tone }}
        />
      </div>
    </motion.div>
  );
}
