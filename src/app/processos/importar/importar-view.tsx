"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type PreviewResult,
} from "./actions";

type Stage = "idle" | "preview" | "committing" | "done";

interface ImportStatsUI {
  totalLinhas: number;
  processosCriados: number;
  analisesInseridas: number;
  ignorados: number;
  errosCount: number;
}

export function ImportarView() {
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [stats, setStats] = useState<ImportStatsUI | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFile(f: File) {
    setFile(f);
    setStage("preview");
    setPreview(null);

    const fd = new FormData();
    fd.append("file", f);
    startTransition(async () => {
      const res = await previewImportAction(fd);
      if (res.ok) setPreview(res.data);
      else {
        toast.error(res.error);
        setStage("idle");
      }
    });
  }

  function handleCommit() {
    if (!file) return;
    setStage("committing");
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await commitImportAction(fd);
      if (res.ok) {
        setStats({
          totalLinhas: res.data.totalLinhas,
          processosCriados: res.data.processosCriados,
          analisesInseridas: res.data.analisesInseridas,
          ignorados: res.data.ignorados,
          errosCount: res.data.erros.length,
        });
        setStage("done");
        toast.success("Import concluído.");
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
          href="/processos"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos processos
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Importar planilha
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Envie o arquivo <span className="font-mono">PROCESSOS_CONTABILIZAR_[2026].xlsx</span>.
          Vamos identificar as abas mensais, validar as linhas e inserir sem
          duplicar processos existentes.
        </p>
      </motion.div>

      {stage === "idle" && (
        <motion.div variants={fadeSlideUp}>
          <DropZone onFile={handleFile} />
        </motion.div>
      )}

      {stage === "preview" && (
        <motion.div variants={fadeSlideUp} className="space-y-4">
          {isPending && !preview ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-6">
                <FileSpreadsheet className="h-6 w-6 animate-pulse text-[var(--accent)]" />
                <div>
                  <p className="font-medium">Analisando planilha...</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Lendo abas mensais e validando linhas.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : preview ? (
            <PreviewPanel
              preview={preview}
              onCommit={handleCommit}
              onCancel={() => {
                setStage("idle");
                setFile(null);
                setPreview(null);
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
                <p className="font-medium">Importando análises...</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Não feche esta aba. Isso pode levar alguns minutos.
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
                <CardTitle>Import concluído</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <StatMini label="Linhas processadas" value={stats.totalLinhas} />
                <StatMini label="Processos únicos criados" value={stats.processosCriados} />
                <StatMini label="Análises inseridas" value={stats.analisesInseridas} />
                <StatMini label="Ignorados" value={stats.ignorados} />
              </div>
              {stats.errosCount > 0 && (
                <p className="mt-4 text-sm text-[var(--warning)]">
                  {stats.errosCount} linhas com erro foram puladas.
                </p>
              )}
              <div className="mt-6">
                <Button asChild>
                  <Link href="/processos">Ver processos importados</Link>
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
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]"
      htmlFor="file-input"
    >
      <FileSpreadsheet className="h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.5} />
      <div>
        <p className="font-medium">Clique ou arraste o arquivo aqui</p>
        <p className="text-sm text-[var(--text-muted)]">
          Formato aceito: .xlsx
        </p>
      </div>
      <input
        id="file-input"
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
  preview,
  onCommit,
  onCancel,
  isPending,
}: {
  preview: PreviewResult;
  onCommit: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatMini label="Linhas válidas" value={preview.totalLinhasValidas} />
        <StatMini label="Processos únicos" value={preview.processosUnicos} />
        <StatMini label="Abas processadas" value={preview.abasProcessadas.length} />
        <StatMini label="Linhas com erro" value={preview.totalErros} tone={preview.totalErros > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abas encontradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {preview.abasProcessadas.map((a) => (
              <Badge key={a} variant="accent">{a}</Badge>
            ))}
            {preview.abasIgnoradas.map((a) => (
              <Badge key={a}>{a} (ignorada)</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {preview.analistasNaoCadastrados.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-[var(--warning)]" />
              <CardTitle className="text-base">
                Analistas não cadastrados ({preview.analistasNaoCadastrados.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              As linhas destes analistas serão ignoradas no commit. Cadastre-os
              em <Link href="/servidores" className="underline">Servidores</Link>{" "}
              antes ou continue sem eles.
            </p>
            <div className="flex flex-wrap gap-2">
              {preview.analistasNaoCadastrados.map((a) => (
                <Badge key={a} variant="warning">{a}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Amostra ({preview.amostra.length} de {formatNumber(preview.totalLinhasValidas)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aba/Linha</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Analista</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.amostra.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs text-[var(--text-muted)]">
                    {l.aba}:{l.linhaNumero}
                  </TableCell>
                  <TableCell className="text-sm">{l.dataAnalise}</TableCell>
                  <TableCell>
                    <Badge variant="accent">{l.sistema}</Badge>
                    {l.finalidade && (
                      <Badge variant="outline" className="ml-1">
                        {l.finalidade}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                    {l.numeroProcesso}
                  </TableCell>
                  <TableCell>
                    {l.analistaApelido}
                    {!l.analistaMatched && (
                      <AlertTriangle className="ml-1 inline h-3 w-3 text-[var(--warning)]" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{l.resultado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {preview.errosAmostra.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              <CardTitle className="text-base">
                Linhas com erro ({preview.errosAmostra.length} de {preview.totalErros})
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
                {preview.errosAmostra.map((e, i) => (
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
        <Button onClick={onCommit} disabled={isPending || preview.totalLinhasValidas === 0}>
          Importar {formatNumber(preview.totalLinhasValidas)} análises
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
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "warning" ? "text-[var(--warning)]" : ""
        }`}
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}
