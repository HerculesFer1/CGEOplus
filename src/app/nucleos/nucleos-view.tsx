"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";

interface NucleoRow {
  id: string;
  nome: string;
  descricao: string | null;
  corTema: string | null;
  minMembros: number;
  ativo: boolean;
  membrosAtivos: number;
}

export function NucleosView({ nucleos }: { nucleos: NucleoRow[] }) {
  const total = nucleos.length;
  const abaixoMin = nucleos.filter((n) => n.membrosAtivos < n.minMembros).length;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div variants={fadeSlideUp}>
        <p className="text-sm text-[var(--text-muted)]">Gestão</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Núcleos</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {total} núcleos configurados · {abaixoMin} operando abaixo do mínimo
          funcional.
        </p>
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
            className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-start justify-between">
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: n.corTema ?? "#8E8E93" }}
              >
                <Layers className="h-5 w-5" strokeWidth={1.75} />
              </div>
              {n.membrosAtivos < n.minMembros && (
                <Badge variant="danger">
                  <AlertTriangle className="h-3 w-3" />
                  crítico
                </Badge>
              )}
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
          </motion.div>
        ))}
      </motion.div>
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
