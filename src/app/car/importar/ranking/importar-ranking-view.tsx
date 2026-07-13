"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fadeSlideUp, staggerContainer } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type {
  UfRankingCommitStats,
  UfRankingPreview,
} from "@/lib/car/uf-ranking-importer";

const SICAR = "#FF9F0A";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type Stage = "idle" | "parsing" | "preview" | "committing" | "done" | "error";

type ActionResult<T> =
  | { ok: true; mode: string; data: T }
  | { ok: false; error: string; code?: string; details?: unknown };

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function postJson<T>(body: unknown): Promise<ActionResult<T>> {
  try {
    const res = await fetch("/api/car/importar/ranking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ActionResult<T>;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro de rede.",
    };
  }
}

interface Props {
  anoDefault: number;
  mesDefault: number;
}

export function ImportarRankingView({ anoDefault, mesDefault }: Props) {
  const [ano, setAno] = useState<number>(anoDefault);
  const [mes, setMes] = useState<number>(mesDefault);
  const [file, setFile] = useState<File | null>(null);
  const [contentB64, setContentB64] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<UfRankingPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [doneStats, setDoneStats] = useState<UfRankingCommitStats | null>(null);

  const [isPending, startTransition] = useTransition();

  const anosDisponiveis = useMemo(() => {
    const y = new Date().getUTCFullYear();
    return [y - 1, y, y + 1];
  }, []);

  function reset() {
    setFile(null);
    setContentB64(null);
    setPreview(null);
    setErrorMsg(null);
    setOverwrite(false);
    setDoneStats(null);
    setStage("idle");
  }

  function handleFile(f: File) {
    setFile(f);
    setPreview(null);
    setOverwrite(false);
    setErrorMsg(null);
    setStage("parsing");

    startTransition(async () => {
      const b64 = await fileToBase64(f);
      setContentB64(b64);
      const res = await postJson<UfRankingPreview>({
        filename: f.name,
        contentBase64: b64,
        ano,
        mes,
        mode: "preview",
      });
      if (res.ok) {
        setPreview(res.data);
        setStage("preview");
      } else {
        setErrorMsg(res.error);
        setStage("error");
        toast.error(res.error);
      }
    });
  }

  function handleCommit() {
    if (!contentB64 || !file) return;
    if (preview?.jaExiste && !overwrite) {
      toast.error("Confirme a sobrescrita antes de inserir.");
      return;
    }
    setStage("committing");
    startTransition(async () => {
      const res = await postJson<UfRankingCommitStats>({
        filename: file.name,
        contentBase64: contentB64,
        ano,
        mes,
        mode: "commit",
        overwrite,
      });
      if (res.ok) {
        setDoneStats(res.data);
        setStage("done");
        toast.success(
          `Ranking de ${MESES[mes - 1]}/${ano} inserido — ${res.data.ufsInseridas} UFs.`,
        );
      } else if (res.code === "OVERWRITE_REQUIRED") {
        setOverwrite(false);
        setStage("preview");
        toast.error("Confirme a sobrescrita e tente novamente.");
      } else {
        setErrorMsg(res.error);
        setStage("error");
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
      <motion.div variants={fadeSlideUp}>
        <Link
          href="/car"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel CAR
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <Trophy className="h-7 w-7" style={{ color: SICAR }} strokeWidth={1.5} />
          <h1 className="text-3xl font-semibold tracking-tight">
            Importar ranking nacional
          </h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Envie a planilha com análises concluídas por UF{" "}
          (<code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">UF | Total do Tema</code>).
          Alimenta o benchmarking do painel — posicionamento do Piauí vs. Brasil e Nordeste.
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Tema atual: <strong className="text-[var(--text)]">Regularidade ambiental concluída</strong>.
        </p>
      </motion.div>

      <motion.div variants={fadeSlideUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período de referência</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select
              value={String(mes)}
              onValueChange={(v) => setMes(Number(v))}
              disabled={stage !== "idle" && stage !== "preview" && stage !== "error"}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(ano)}
              onValueChange={(v) => setAno(Number(v))}
              disabled={stage !== "idle" && stage !== "preview" && stage !== "error"}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div
            key="idle"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8 }}
          >
            <DropZone onFile={handleFile} />
          </motion.div>
        )}

        {stage === "parsing" && (
          <motion.div key="parsing" variants={fadeSlideUp} initial="hidden" animate="visible">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <FileSpreadsheet
                  className="h-8 w-8 animate-pulse"
                  style={{ color: SICAR }}
                  strokeWidth={1.5}
                />
                <div>
                  <p className="font-medium">Lendo planilha…</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Validando UFs e totais.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "preview" && preview && (
          <motion.div
            key="preview"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <PreviewPanel
              preview={preview}
              overwrite={overwrite}
              onOverwriteChange={setOverwrite}
              onCommit={handleCommit}
              onReset={reset}
              isPending={isPending}
              ano={ano}
              mes={mes}
            />
          </motion.div>
        )}

        {stage === "committing" && (
          <motion.div key="committing" variants={fadeSlideUp} initial="hidden" animate="visible">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <Upload className="h-8 w-8 animate-pulse text-[var(--accent)]" strokeWidth={1.5} />
                <div>
                  <p className="font-medium">Gravando ranking…</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Persistindo 27 UFs em transação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "done" && doneStats && (
          <motion.div key="done" variants={fadeSlideUp} initial="hidden" animate="visible">
            <DoneCard stats={doneStats} onReset={reset} />
          </motion.div>
        )}

        {stage === "error" && (
          <motion.div key="error" variants={fadeSlideUp} initial="hidden" animate="visible">
            <Card className="border-[var(--danger)]/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[var(--danger)]" strokeWidth={1.75} />
                  <CardTitle className="text-base">Não foi possível importar</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{errorMsg}</p>
                <Button variant="outline" onClick={reset}>
                  Tentar de novo
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── DropZone ────────────────────────────────────────────────────────────── */

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  return (
    <label
      htmlFor="file-ranking"
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition-colors hover:border-[#FF9F0A] hover:bg-[var(--surface)]"
    >
      <Trophy className="h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.5} />
      <div>
        <p className="font-medium">Clique ou arraste a planilha do ranking</p>
        <p className="text-sm text-[var(--text-muted)]">
          Formatos aceitos: <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">.xlsx</code>{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">.xls</code>{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">.csv</code> —
          colunas: UF · Total do Tema
        </p>
      </div>
      <input
        id="file-ranking"
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}

/* ── PreviewPanel ────────────────────────────────────────────────────────── */

function PreviewPanel({
  preview,
  overwrite,
  onOverwriteChange,
  onCommit,
  onReset,
  isPending,
  ano,
  mes,
}: {
  preview: UfRankingPreview;
  overwrite: boolean;
  onOverwriteChange: (v: boolean) => void;
  onCommit: () => void;
  onReset: () => void;
  isPending: boolean;
  ano: number;
  mes: number;
}) {
  const sorted = [...preview.rows].sort((a, b) => b.total - a.total);
  const piRank = sorted.findIndex((r) => r.uf === "PI") + 1;
  const piValue = preview.rows.find((r) => r.uf === "PI")?.total ?? 0;
  const somaBate =
    preview.linhaTotalArquivo === null || preview.linhaTotalArquivo === preview.soma;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" strokeWidth={1.75} />
            <CardTitle className="text-base">Prévia do ranking</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-[var(--text-muted)]">
          <p>
            <strong className="text-[var(--text)]">{preview.rows.length}</strong> UFs ·
            soma <strong className="text-[var(--text)]">{formatNumber(preview.soma)}</strong>
            {preview.linhaTotalArquivo !== null && (
              <> · Total do arquivo: {formatNumber(preview.linhaTotalArquivo)}</>
            )}
          </p>
          <p>Referência: {MESES[mes - 1]}/{ano}</p>
        </CardContent>
      </Card>

      {/* Destaque do PI */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Posição do Piauí
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: SICAR }}>
            {piRank > 0 ? `#${piRank}° de ${preview.rows.length}` : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Análises PI
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(piValue)}</p>
        </div>
        <div className="rounded-xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Share do Brasil
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {preview.soma > 0 ? `${((piValue / preview.soma) * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Avisos */}
      {preview.ufsAusentes.length > 0 && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" strokeWidth={1.75} />
            <p>
              <strong>{preview.ufsAusentes.length} UF(s) ausente(s)</strong> — só {preview.rows.length} UFs
              serão gravadas. Ausentes: {preview.ufsAusentes.join(", ")}.
            </p>
          </CardContent>
        </Card>
      )}
      {!somaBate && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" strokeWidth={1.75} />
            <p>
              Total do arquivo ({formatNumber(preview.linhaTotalArquivo!)}) diverge da soma das
              UFs ({formatNumber(preview.soma)}). Você pode inserir mesmo assim.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ranking preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking das UFs importadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--elevated)]">
                <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">UF</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={r.uf}
                    className={`border-t border-[var(--border)] ${
                      r.uf === "PI" ? "bg-[#FF9F0A]/10 font-semibold" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-4 tabular-nums text-[var(--text-muted)]">
                      {i + 1}°
                    </td>
                    <td className="py-1.5 pr-4">{r.uf}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatNumber(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sobrescrita */}
      {preview.jaExiste && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" strokeWidth={1.75} />
            <div className="flex-1 space-y-2 text-sm">
              <p>
                <strong>Já existe ranking para {String(mes).padStart(2, "0")}/{ano}</strong>
                {" "}({preview.jaExiste.totalUfs} UFs, soma {formatNumber(preview.jaExiste.somaExistente)}).
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => onOverwriteChange(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-strong)]"
                />
                <span>Sobrescrever ranking existente ao inserir.</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onReset} disabled={isPending}>
          <X className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
          Cancelar
        </Button>
        <Button variant="outline" onClick={onReset} disabled={isPending}>
          <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
          Reimportar
        </Button>
        <Button
          onClick={onCommit}
          disabled={isPending || (!!preview.jaExiste && !overwrite)}
        >
          Inserir dados
        </Button>
      </div>
    </div>
  );
}

/* ── DoneCard ────────────────────────────────────────────────────────────── */

function DoneCard({
  stats,
  onReset,
}: {
  stats: UfRankingCommitStats;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" strokeWidth={1.75} />
          <CardTitle className="text-base">
            Ranking de {MESES[stats.mes - 1]}/{stats.ano} inserido
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              UFs gravadas
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(stats.ufsInseridas)}
            </p>
          </div>
          <div className="rounded-xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Soma total
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(stats.soma)}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onReset}>
            Novo ranking
          </Button>
          <Link href="/car">
            <Button>Ver dashboard</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
