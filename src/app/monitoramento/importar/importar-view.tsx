"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

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

import {
  previewImportAction,
  commitImportAction,
  type PreviewPayload,
} from "./actions";

type Stage = "idle" | "preview" | "committing" | "done";

interface Programa {
  sigla: string;
  nome: string;
}

interface CommitStatsUI {
  totalLinhas: number;
  titulosInseridos: number;
  duplicados: number;
  semIntervalo: number;
  comunidadesCriadas: number;
}

export function ImportarMonitoramentoView({
  programas,
}: {
  programas: Programa[];
}) {
  const [sigla, setSigla] = useState<string>(programas[0]?.sigla ?? "");
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [stats, setStats] = useState<CommitStatsUI | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(f: File) {
    if (!sigla) {
      toast.error("Selecione o programa antes de enviar o arquivo.");
      return;
    }
    setFile(f);
    setStage("preview");
    setPayload(null);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("programaSigla", sigla);
    startTransition(async () => {
      const res = await previewImportAction(fd);
      if (res.ok) setPayload(res.data);
      else {
        toast.error(res.error);
        setStage("idle");
      }
    });
  }

  function handleCommit() {
    if (!file || !sigla) return;
    setStage("committing");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("programaSigla", sigla);
    startTransition(async () => {
      const res = await commitImportAction(fd);
      if (res.ok) {
        setStats({
          totalLinhas: res.data.totalLinhas,
          titulosInseridos: res.data.titulosInseridos,
          duplicados: res.data.duplicados,
          semIntervalo: res.data.semIntervalo,
          comunidadesCriadas: res.data.comunidadesCriadas,
        });
        setStage("done");
        toast.success("Importação concluída.");
      } else {
        toast.error(res.error);
        setStage("preview");
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
      <motion.div variants={fadeSlideUp}>
        <Link
          href="/monitoramento"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao monitoramento
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Importar planilha de monitoramento
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Envie a planilha de titulação (PSI ou PILARES II). O sistema
          identifica as abas de detalhe, aloca cada linha ao intervalo pela
          data de assinatura e desduplica por processo SEI.
        </p>
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programa alvo</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={sigla} onValueChange={setSigla}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Selecione um programa" />
              </SelectTrigger>
              <SelectContent>
                {programas.map((p) => (
                  <SelectItem key={p.sigla} value={p.sigla}>
                    {p.sigla} — {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {stage === "idle" && (
        <motion.div variants={fadeSlideUp}>
          <DropZone onFile={handleFile} />
        </motion.div>
      )}

      {stage === "preview" && (
        <motion.div variants={fadeSlideUp} className="space-y-4">
          {isPending && !payload ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-6">
                <FileSpreadsheet className="h-6 w-6 animate-pulse text-[var(--accent)]" />
                <div>
                  <p className="font-medium">Analisando planilha...</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Lendo abas de detalhe e casando com comunidades.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : payload ? (
            <PreviewPanel
              payload={payload}
              onCommit={handleCommit}
              onCancel={() => {
                setStage("idle");
                setFile(null);
                setPayload(null);
              }}
              isPending={isPending}
            />
          ) : null}
        </motion.div>
      )}

      {stage === "committing" && (
        <motion.div variants={fadeSlideUp}>
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Upload className="h-6 w-6 animate-pulse text-[var(--accent)]" />
              <div>
                <p className="font-medium">Importando títulos...</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Não feche esta aba. Pode levar até 1 minuto para arquivos grandes.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {stage === "done" && stats && (
        <motion.div variants={fadeSlideUp}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                <CardTitle>Importação concluída</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-5">
                <StatMini label="Linhas lidas" value={stats.totalLinhas} />
                <StatMini label="Títulos inseridos" value={stats.titulosInseridos} />
                <StatMini label="Duplicados ignorados" value={stats.duplicados} />
                <StatMini label="Sem intervalo" value={stats.semIntervalo} tone={stats.semIntervalo > 0 ? "warning" : "default"} />
                <StatMini label="Comunidades novas" value={stats.comunidadesCriadas} />
              </div>
              <div className="mt-6 flex gap-2">
                <Button asChild>
                  <Link href="/monitoramento">Ver dashboard</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStage("idle");
                    setFile(null);
                    setPayload(null);
                    setStats(null);
                  }}
                >
                  Importar outra planilha
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  return (
    <label
      htmlFor="file-monitoramento"
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]"
    >
      <FileSpreadsheet className="h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.5} />
      <div>
        <p className="font-medium">Clique ou arraste o arquivo aqui</p>
        <p className="text-sm text-[var(--text-muted)]">
          Formato aceito: .xlsx (planilha PSI MONITORAMENTO ou PILARES II - Monitoramento)
        </p>
      </div>
      <input
        id="file-monitoramento"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function PreviewPanel({
  payload,
  onCommit,
  onCancel,
  isPending,
}: {
  payload: PreviewPayload;
  onCommit: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { parse, preview } = payload;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        <StatMini label="Linhas lidas" value={parse.linhas} />
        <StatMini label="A inserir" value={preview.linhasParaInserir} tone="accent" />
        <StatMini label="Duplicadas" value={preview.linhasDuplicadas} tone={preview.linhasDuplicadas > 0 ? "warning" : "default"} />
        <StatMini label="Sem intervalo" value={preview.linhasSemIntervalo} tone={preview.linhasSemIntervalo > 0 ? "warning" : "default"} />
        <StatMini label="Comunidades novas" value={preview.comunidadesNovas.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programa e intervalos identificados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--text-muted)]">
            Programa: <strong>{preview.programa.sigla}</strong> — {preview.programa.nome}
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.intervalos.map((i) => (
              <Badge key={i.rotulo} variant="accent">
                {i.rotulo} · {formatNumber(i.qtd)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abas encontradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {parse.abasProcessadas.map((a) => (
              <Badge key={a} variant="accent">
                {a}
              </Badge>
            ))}
            {parse.abasIgnoradas.map((a) => (
              <Badge key={a}>{a} (ignorada)</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {preview.comunidadesNovas.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle className="text-base">
                Comunidades novas ({preview.comunidadesNovas.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Serão criadas automaticamente no cadastro único.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preview.comunidadesNovas.slice(0, 30).map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
              {preview.comunidadesNovas.length > 30 && (
                <Badge variant="outline">+ {preview.comunidadesNovas.length - 30}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Amostra ({preview.amostra.length} linhas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aba/Linha</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Comunidade</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>CAR</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.amostra.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs text-[var(--text-muted)]">
                    {l.aba}:{l.linhaNumero}
                  </TableCell>
                  <TableCell className="text-sm">{l.dataAssinatura}</TableCell>
                  <TableCell className="text-xs">{l.intervaloRotulo ?? "—"}</TableCell>
                  <TableCell className="text-sm max-w-[240px] truncate">{l.comunidade}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[180px] truncate">
                    {l.processoSei ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.car === "SIM" ? "accent" : "outline"}>
                      {l.car === "SIM" ? "sim" : l.car === "NAO" ? "não" : "pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.duplicado ? (
                      <Badge variant="warning">duplicado</Badge>
                    ) : (
                      <Badge variant="accent">novo</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {parse.errosAmostra.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              <CardTitle className="text-base">
                Linhas ignoradas ({parse.erros} no total)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aba/Linha</TableHead>
                  <TableHead>Problema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parse.errosAmostra.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">
                      {e.aba}:{e.linhaNumero}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--danger)]">
                      {e.problema}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          onClick={onCommit}
          disabled={isPending || preview.linhasParaInserir === 0}
        >
          Importar {formatNumber(preview.linhasParaInserir)} títulos
        </Button>
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "accent";
}) {
  const color =
    tone === "warning"
      ? "text-[var(--warning)]"
      : tone === "accent"
        ? "text-[var(--accent)]"
        : "";
  return (
    <div className="rounded-xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}
