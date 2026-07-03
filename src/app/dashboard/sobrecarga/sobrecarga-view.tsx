"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Users, Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { fadeSlideUp, staggerContainer, spring } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type { CargaNucleo } from "@/lib/services/dashboard.service";

interface Props {
  nucleos: CargaNucleo[];
}

export function SobrecargaView({ nucleos }: Props) {
  const criticos = nucleos.filter((n) => n.sobrecargaPercentual >= 60);
  const abaixoMinimo = nucleos.filter((n) => n.totalMembros < n.minMembros);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      <motion.div variants={fadeSlideUp}>
        <p className="text-sm text-[var(--text-muted)]">Visão geral</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Sobrecarga operacional
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Índice combinado por núcleo: carga total × mínimo funcional × ritmo
          mensal.
        </p>
      </motion.div>

      {(criticos.length > 0 || abaixoMinimo.length > 0) && (
        <motion.div
          variants={fadeSlideUp}
          className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--warning)]" />
            <div>
              <h3 className="font-semibold">Atenção operacional</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {criticos.length} núcleo(s) com índice de sobrecarga ≥ 60% ·{" "}
                {abaixoMinimo.length} núcleo(s) abaixo do mínimo funcional
                declarado.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={staggerContainer} className="grid gap-4">
        {nucleos.map((n) => (
          <NucleoCard key={n.nucleoNome} n={n} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function NucleoCard({ n }: { n: CargaNucleo }) {
  const abaixoMin = n.totalMembros < n.minMembros;
  const tone =
    n.sobrecargaPercentual >= 60
      ? "danger"
      : n.sobrecargaPercentual >= 30
      ? "warning"
      : "success";

  const toneColor =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warning"
      ? "var(--warning)"
      : "var(--success)";

  return (
    <motion.div
      variants={fadeSlideUp}
      whileHover={{ y: -2 }}
      transition={spring.gentle}
      className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">{n.nucleoNome}</h3>
            {abaixoMin && (
              <Badge variant="danger">
                <AlertTriangle className="h-3 w-3" />
                abaixo do mínimo
              </Badge>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <strong className="text-[var(--text)]">
                {n.totalMembros}
              </strong>{" "}
              / {n.minMembros} membros
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <strong className="text-[var(--text)]">
                {formatNumber(n.totalAnalises)}
              </strong>{" "}
              análises
            </span>
            <span>
              Média por membro:{" "}
              <strong className="text-[var(--text)]">
                {formatNumber(Math.round(n.mediaAnalisesPorMembro))}
              </strong>
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Sobrecarga
          </p>
          <p
            className="mt-1 text-4xl font-semibold tabular-nums tracking-tight"
            style={{ color: toneColor }}
          >
            {n.sobrecargaPercentual.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: toneColor }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, n.sobrecargaPercentual)}%` }}
            transition={{ ...spring.gentle, delay: 0.1 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
