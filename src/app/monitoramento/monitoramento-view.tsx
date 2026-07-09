"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Upload,
  TrendingUp,
  Building2,
  BadgeCheck,
  Users,
  Target,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/table";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type {
  ResumoComunidade,
  ResumoIntervalo,
} from "@/lib/monitoramento/queries";

interface Programa {
  sigla: string;
  nome: string;
  orgao: string | null;
}

interface Props {
  programas: Programa[];
  programaSelecionada: string;
  intervaloSelecionado: string | undefined;
  intervalos: ResumoIntervalo[];
  comunidades: ResumoComunidade[];
}

function pct(v: string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function pctTone(v: string | null | undefined): "success" | "warning" | "default" {
  if (v === null || v === undefined) return "default";
  const n = Number(v);
  if (n >= 1) return "success";
  if (n >= 0.7) return "warning";
  return "default";
}

export function MonitoramentoView({
  programas,
  programaSelecionada,
  intervaloSelecionado,
  intervalos,
  comunidades,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programaInfo = programas.find((p) => p.sigla === programaSelecionada);

  const totais = intervalos.reduce(
    (acc, i) => ({
      titulos: acc.titulos + i.titulos_total,
      car: acc.car + i.car_total,
      familias: acc.familias + i.familias_total,
      validados: acc.validados + i.validados_total,
      metaCar: acc.metaCar + (i.meta_car ?? 0),
      metaFamilias: acc.metaFamilias + (i.meta_familias ?? 0),
    }),
    { titulos: 0, car: 0, familias: 0, validados: 0, metaCar: 0, metaFamilias: 0 },
  );

  const pctCarTotal =
    totais.metaCar > 0 ? String(totais.car / totais.metaCar) : null;
  const pctFamTotal =
    totais.metaFamilias > 0 ? String(totais.familias / totais.metaFamilias) : null;

  function updateQS(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`/monitoramento?${sp.toString()}`);
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      <motion.div variants={fadeSlideUp} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Monitoramento de programas
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
            Consolidado de títulos, CAR emitidos, famílias atendidas e validações
            SICAR por intervalo. Substitui as abas de RESUMO/AVANÇO das planilhas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/monitoramento/relatorio?programa=${programaSelecionada}`}>
              <Download className="mr-2 h-4 w-4" />
              Exportar relatório
            </a>
          </Button>
          <Button asChild>
            <Link href="/monitoramento/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar planilha
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-[220px] flex-1">
              <label className="text-xs font-medium tracking-wide text-[var(--text-muted)]">
                Programa
              </label>
              <Select
                value={programaSelecionada}
                onValueChange={(v) => updateQS({ programa: v, intervalo: undefined })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programas.map((p) => (
                    <SelectItem key={p.sigla} value={p.sigla}>
                      {p.sigla} — {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[240px] flex-1">
              <label className="text-xs font-medium tracking-wide text-[var(--text-muted)]">
                Intervalo (opcional)
              </label>
              <Select
                value={intervaloSelecionado ?? "__all__"}
                onValueChange={(v) => updateQS({ intervalo: v === "__all__" ? undefined : v })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os intervalos</SelectItem>
                  {intervalos.map((i) => (
                    <SelectItem key={i.intervalo_id} value={i.intervalo_id}>
                      {i.intervalo_rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {programaInfo?.orgao && (
              <div className="text-xs text-[var(--text-muted)]">
                <p className="tracking-wide">Órgão</p>
                <p className="mt-1 font-medium text-[var(--text)]">{programaInfo.orgao}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeSlideUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Títulos"
          value={totais.titulos}
          icon={TrendingUp}
          tone="accent"
        />
        <Kpi
          label="CAR emitidos"
          value={totais.car}
          icon={Building2}
          hint={
            totais.metaCar > 0
              ? `${formatNumber(totais.metaCar)} meta acumulada`
              : undefined
          }
          rightBadge={pct(pctCarTotal)}
          rightTone={pctTone(pctCarTotal)}
        />
        <Kpi
          label="Famílias"
          value={totais.familias}
          icon={Users}
          hint={
            totais.metaFamilias > 0
              ? `${formatNumber(totais.metaFamilias)} meta acumulada`
              : undefined
          }
          rightBadge={pct(pctFamTotal)}
          rightTone={pctTone(pctFamTotal)}
        />
        <Kpi
          label="Validados SICAR"
          value={totais.validados}
          icon={BadgeCheck}
          tone="success"
        />
        <Kpi
          label="Comunidades atingidas"
          value={new Set(comunidades.map((c) => c.comunidade_id)).size}
          icon={Target}
        />
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso por intervalo</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Comunidades</TableHead>
                  <TableHead className="text-right">Títulos</TableHead>
                  <TableHead className="text-right">CAR</TableHead>
                  <TableHead className="text-right">Meta CAR</TableHead>
                  <TableHead className="text-right">% CAR</TableHead>
                  <TableHead className="text-right">Famílias</TableHead>
                  <TableHead className="text-right">Meta fam.</TableHead>
                  <TableHead className="text-right">% Famílias</TableHead>
                  <TableHead className="text-right">Validados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intervalos.map((i) => (
                  <TableRow key={i.intervalo_id}>
                    <TableCell className="font-medium">{i.intervalo_rotulo}</TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">
                      {i.data_inicio} → {i.data_fim}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(i.comunidades_total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(i.titulos_total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(i.car_total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-[var(--text-muted)]">
                      {i.meta_car ? formatNumber(i.meta_car) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pctTone(i.pct_car) === "success" ? "success" : pctTone(i.pct_car) === "warning" ? "warning" : "outline"}>
                        {pct(i.pct_car)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(i.familias_total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-[var(--text-muted)]">
                      {i.meta_familias ? formatNumber(i.meta_familias) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pctTone(i.pct_familias) === "success" ? "success" : pctTone(i.pct_familias) === "warning" ? "warning" : "outline"}>
                        {pct(i.pct_familias)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(i.validados_total)}</TableCell>
                  </TableRow>
                ))}
                {intervalos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="p-8 text-center text-sm text-[var(--text-muted)]">
                      Nenhum intervalo cadastrado. Confira o seed em programa_intervalos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resumo por comunidade
              {intervaloSelecionado && (
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                  (filtrado)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comunidade</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead className="text-right">Títulos</TableHead>
                  <TableHead className="text-right">CAR</TableHead>
                  <TableHead className="text-right">Famílias</TableHead>
                  <TableHead className="text-right">Validados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comunidades.map((c) => (
                  <TableRow key={`${c.intervalo_id}-${c.comunidade_id}`}>
                    <TableCell className="font-medium">{c.comunidade}</TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {c.municipio ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{c.intervalo_rotulo}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.titulos_total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.car_total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.familias_total)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.validados_total > 0 ? (
                        <Badge variant="success">{formatNumber(c.validados_total)}</Badge>
                      ) : (
                        <span className="text-[var(--text-muted)]">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {comunidades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center text-sm text-[var(--text-muted)]">
                      Nenhum título importado ainda.{" "}
                      <Link href="/monitoramento/importar" className="underline">
                        Importar planilha agora
                      </Link>
                      .
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
  rightBadge,
  rightTone = "default",
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  rightBadge?: string;
  rightTone?: "default" | "success" | "warning";
  tone?: "default" | "accent" | "success";
}) {
  const iconColor =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "success"
        ? "text-[var(--success)]"
        : "text-[var(--text-muted)]";

  const badgeVariant =
    rightTone === "success" ? "success" : rightTone === "warning" ? "warning" : "outline";

  return (
    <div className="rounded-2xl border bg-[var(--elevated)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-semibold tabular-nums">{formatNumber(value)}</p>
        {rightBadge && <Badge variant={badgeVariant}>{rightBadge}</Badge>}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}
