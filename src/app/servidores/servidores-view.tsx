"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NucleoBadge } from "@/components/ui/nucleo-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { formatDate } from "@/lib/utils";
import type { Servidor } from "@/lib/services/servidores.service";

import { ServidorFormDialog } from "./servidor-form-dialog";
import { deleteServidorAction } from "./actions";

interface Props {
  initialData: Servidor[];
  nucleosDisponiveis: string[];
}

const VINCULO_COLORS: Record<string, "accent" | "outline" | "default"> = {
  Efetivo: "accent",
  "Consultor PSI": "outline",
  "Consultor Pilares II": "outline",
  Consultor: "outline",
  Suporte: "default",
};

export function ServidoresView({ initialData, nucleosDisponiveis }: Props) {
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Servidor | null>(null);
  const [deleting, setDeleting] = useState<Servidor | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialData;
    return initialData.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) ||
        s.apelido.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.nucleoPrincipal.toLowerCase().includes(q) ||
        s.cargo.toLowerCase().includes(q),
    );
  }, [initialData, search]);

  function handleEdit(s: Servidor) {
    setEditing(s);
    setOpenForm(true);
  }

  function handleNew() {
    setEditing(null);
    setOpenForm(true);
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteServidorAction(deleting.id);
      if (res.ok) {
        toast.success(`${deleting.nome} removido(a).`);
        setDeleting(null);
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
      className="space-y-6"
    >
      <motion.div
        variants={fadeSlideUp}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <p className="text-sm text-[var(--text-muted)]">Gestão</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Servidores
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {initialData.length} colaboradores ativos · organizados por núcleo
            principal
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          Novo servidor
        </Button>
      </motion.div>

      <motion.div variants={fadeSlideUp} className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          placeholder="Buscar por nome, apelido, e-mail, núcleo..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Apelido</TableHead>
              <TableHead>Núcleo</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Ingresso</TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={6}>
                  {search
                    ? `Nenhum servidor encontrado para "${search}".`
                    : "Nenhum servidor cadastrado ainda."}
                </TableEmpty>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.nome}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {s.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.apelido}</TableCell>
                  <TableCell>
                    <NucleoBadge
                      nome={s.nucleoPrincipal}
                      cor={s.nucleoCorTema}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={VINCULO_COLORS[s.tipoVinculo] ?? "default"}>
                      {s.tipoVinculo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {formatDate(s.dataIngresso)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(s)}
                        aria-label={`Editar ${s.nome}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(s)}
                        aria-label={`Remover ${s.nome}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>

      <ServidorFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        servidor={editing}
        nucleosDisponiveis={nucleosDisponiveis}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover servidor?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  Esta ação removerá <strong>{deleting.nome}</strong> dos
                  registros. O histórico de análises associadas será preservado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
