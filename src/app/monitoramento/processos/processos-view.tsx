"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDate, formatNumber } from "@/lib/utils";
import type { Paged, Processo } from "@/lib/services/processos.service";

import { RegistrarAnaliseDialog } from "./registrar-analise-dialog";
import { deleteProcessoAction } from "./actions";

interface Props {
  initialData: Paged<Processo>;
  servidores: { id: string; apelido: string; nome: string }[];
  currentFilters: { sistema?: string; busca?: string };
}

const SISTEMA_COLORS: Record<Processo["sistema"], "accent" | "success" | "warning" | "danger"> = {
  SEI: "accent",
  SIGA: "success",
  SICAR: "warning",
  SINAFLOR: "danger",
};

const STATUS_LABEL: Record<Processo["statusAtual"], string> = {
  em_analise: "Em análise",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const STATUS_COLOR: Record<
  Processo["statusAtual"],
  "warning" | "success" | "default"
> = {
  em_analise: "warning",
  concluido: "success",
  arquivado: "default",
};

export function ProcessosView({ initialData, servidores, currentFilters }: Props) {
  const router = useRouter();
  const [openRegistrar, setOpenRegistrar] = useState(false);
  const [deleting, setDeleting] = useState<Processo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState(currentFilters.busca ?? "");
  const [sistema, setSistema] = useState(currentFilters.sistema ?? "todos");

  const { rows, total, page, pageSize } = initialData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const stats = useMemo(() => {
    return {
      sei: rows.filter((r) => r.sistema === "SEI").length,
      siga: rows.filter((r) => r.sistema === "SIGA").length,
      sicar: rows.filter((r) => r.sistema === "SICAR").length,
    };
  }, [rows]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (busca.trim()) params.set("busca", busca.trim());
    if (sistema !== "todos") params.set("sistema", sistema);
    router.push(`/monitoramento/processos?${params.toString()}`);
  }

  function goPage(target: number) {
    const params = new URLSearchParams();
    if (busca.trim()) params.set("busca", busca.trim());
    if (sistema !== "todos") params.set("sistema", sistema);
    params.set("page", String(target));
    router.push(`/monitoramento/processos?${params.toString()}`);
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteProcessoAction(deleting.id);
      if (res.ok) {
        toast.success(`Processo ${deleting.numero} removido.`);
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
          <p className="text-sm text-[var(--text-muted)]">Operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Processos</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {formatNumber(total)} processos únicos · página {page} de {totalPages}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/monitoramento/processos/importar">
              <FileText className="h-4 w-4" />
              Importar planilha
            </Link>
          </Button>
          <Button onClick={() => setOpenRegistrar(true)}>
            <Plus className="h-4 w-4" />
            Registrar análise
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeSlideUp} className="grid gap-3 sm:grid-cols-3">
        <StatCard label="SEI" value={stats.sei} color="var(--accent)" />
        <StatCard label="SIGA" value={stats.siga} color="var(--success)" />
        <StatCard label="SICAR" value={stats.sicar} color="var(--warning)" />
      </motion.div>

      <motion.div variants={fadeSlideUp} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar por número, requerente, município..."
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <Select value={sistema} onValueChange={setSistema}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os sistemas</SelectItem>
            <SelectItem value="SEI">SEI</SelectItem>
            <SelectItem value="SIGA">SIGA</SelectItem>
            <SelectItem value="SICAR">SICAR</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={applyFilters}>
          Aplicar
        </Button>
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead>Requerente</TableHead>
              <TableHead className="text-right">Análises</TableHead>
              <TableHead>Última</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={7}>
                  Nenhum processo encontrado. Comece registrando uma análise ou
                  importando a planilha atual.
                </TableEmpty>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/monitoramento/processos/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.numero}
                    </Link>
                    {p.municipio && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {p.municipio}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={SISTEMA_COLORS[p.sistema]}>
                        {p.sistema}
                      </Badge>
                      {p.sicarFinalidade && (
                        <Badge variant="outline">{p.sicarFinalidade}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {p.requerente ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {p.totalAnalises}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-muted)]">
                    {p.ultimaAnalise ? formatDate(p.ultimaAnalise) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLOR[p.statusAtual]}>
                      {STATUS_LABEL[p.statusAtual]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(p)}
                      aria-label={`Remover ${p.numero}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>

      {totalPages > 1 && (
        <motion.div
          variants={fadeSlideUp}
          className="flex items-center justify-between"
        >
          <p className="text-xs text-[var(--text-muted)]">
            Mostrando {rows.length} de {formatNumber(total)}
          </p>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="inline-flex h-9 items-center px-3 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => goPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <RegistrarAnaliseDialog
        open={openRegistrar}
        onOpenChange={setOpenRegistrar}
        servidores={servidores}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover processo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  Esta ação removerá o processo <strong>{deleting.numero}</strong>{" "}
                  e todas as suas análises ({deleting.totalAnalises}). Não pode
                  ser desfeita.
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

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-[var(--elevated)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label} (nesta página)
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {formatNumber(value)}
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}
