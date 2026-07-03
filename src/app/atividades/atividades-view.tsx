"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
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

interface AtividadeRow {
  id: string;
  nome: string;
  complexidade: "N1" | "N2" | "N3";
  descricao: string | null;
  ativo: boolean;
  nucleoNome: string | null;
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
  Coordenacao: "accent",
  Licenciamento: "success",
  CAR: "warning",
  Fiscalizacao: "danger",
  Administrativo: "default",
};

export function AtividadesView({ atividades }: { atividades: AtividadeRow[] }) {
  const porComplex = atividades.reduce(
    (acc, a) => {
      acc[a.complexidade]++;
      return acc;
    },
    { N1: 0, N2: 0, N3: 0 } as Record<AtividadeRow["complexidade"], number>,
  );
  const totalN3Pct =
    atividades.length > 0 ? (porComplex.N3 / atividades.length) * 100 : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div variants={fadeSlideUp}>
        <p className="text-sm text-[var(--text-muted)]">Gestão</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Atividades
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {atividades.length} atividades cadastradas · {totalN3Pct.toFixed(0)}%
          de alta complexidade (N3).
        </p>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {atividades.length === 0 ? (
              <TableRow>
                <TableEmpty colSpan={4}>
                  Nenhuma atividade cadastrada.
                </TableEmpty>
              </TableRow>
            ) : (
              atividades.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
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
