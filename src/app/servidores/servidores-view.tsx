"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TIPO_VINCULO } from "@/lib/validators/servidor";
import type { Servidor } from "@/lib/services/servidores.service";

import { displayVinculo } from "./vinculo-display";

const GERENCIA_LABEL = "Gerência";

import { ServidorFormDialog } from "./servidor-form-dialog";
import { ServidorMiniCard } from "./servidor-mini-card";
import { ServidorDetailDialog } from "./servidor-detail-dialog";
import { deleteServidorAction } from "./actions";

interface Props {
  initialData: Servidor[];
  nucleosDisponiveis: string[];
}

interface Group {
  key: string;
  label: string;
  cor?: string | null;
  servidores: Servidor[];
}

function byApelido(a: Servidor, b: Servidor) {
  return (a.apelido || a.nome).localeCompare(b.apelido || b.nome, "pt-BR");
}

function groupServidores(list: Servidor[]): Group[] {
  const gerencia: Servidor[] = [];
  const porVinculo = new Map<string, Servidor[]>();

  for (const s of list) {
    if (s.nucleoPrincipal === GERENCIA_LABEL) {
      gerencia.push(s);
      continue;
    }
    const key = s.tipoVinculo || "Outros";
    if (!porVinculo.has(key)) porVinculo.set(key, []);
    porVinculo.get(key)!.push(s);
  }

  const groups: Group[] = [];

  if (gerencia.length > 0) {
    groups.push({
      key: `nucleo:${GERENCIA_LABEL}`,
      label: GERENCIA_LABEL,
      cor: gerencia[0].nucleoCorTema,
      servidores: gerencia.sort(byApelido),
    });
  }

  for (const vinculo of TIPO_VINCULO) {
    const membros = porVinculo.get(vinculo);
    if (!membros?.length) continue;
    groups.push({
      key: `vinculo:${vinculo}`,
      label: displayVinculo(vinculo),
      servidores: membros.sort(byApelido),
    });
    porVinculo.delete(vinculo);
  }

  // Vínculos que não constam na ordem canônica — mantém no fim, alfabético.
  const restantes = [...porVinculo.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "pt-BR"),
  );
  for (const [vinculo, membros] of restantes) {
    groups.push({
      key: `vinculo:${vinculo}`,
      label: displayVinculo(vinculo),
      servidores: membros.sort(byApelido),
    });
  }

  return groups;
}

export function ServidoresView({ initialData, nucleosDisponiveis }: Props) {
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Servidor | null>(null);
  const [viewing, setViewing] = useState<Servidor | null>(null);
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

  const groups = useMemo(() => groupServidores(filtered), [filtered]);

  function handleEdit(s: Servidor) {
    setViewing(null);
    setEditing(s);
    setOpenForm(true);
  }

  function handleNew() {
    setEditing(null);
    setOpenForm(true);
  }

  function handleAskDelete(s: Servidor) {
    setViewing(null);
    setDeleting(s);
  }

  function handleConfirmDelete() {
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
            {initialData.length} colaboradores ativos · Gerência em destaque,
            demais agrupados por vínculo
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

      {groups.length === 0 ? (
        <motion.p
          variants={fadeSlideUp}
          className="rounded-2xl border bg-[var(--elevated)] p-8 text-center text-sm text-[var(--text-muted)]"
        >
          {search
            ? `Nenhum servidor encontrado para "${search}".`
            : "Nenhum servidor cadastrado ainda."}
        </motion.p>
      ) : (
        <motion.div variants={fadeSlideUp} className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-baseline justify-between border-b pb-2">
                <h2
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={group.cor ? { color: group.cor } : undefined}
                >
                  {group.label}
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {group.servidores.length}{" "}
                  {group.servidores.length === 1 ? "membro" : "membros"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.servidores.map((s) => (
                  <ServidorMiniCard
                    key={s.id}
                    servidor={s}
                    onClick={() => setViewing(s)}
                  />
                ))}
              </div>
            </section>
          ))}
        </motion.div>
      )}

      <ServidorDetailDialog
        servidor={viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        onEdit={handleEdit}
        onDelete={handleAskDelete}
      />

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
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
