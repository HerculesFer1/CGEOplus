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
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import {
  CAR_BUCKETS_AGREGADOS,
  type CarBucket,
} from "@/lib/car/types";
import type { CarPreviewPayload } from "@/app/api/car/importar/parse/route";
import type { CarCommitStats } from "@/lib/car/importer";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; details?: unknown };

async function postJson<T>(url: string, body: unknown): Promise<ActionResult<T>> {
  try {
    const res = await fetch(url, {
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

/** Upload direto pro Supabase Storage via URL assinada.
 *  Bypassa completamente o limite de body multipart do Next.js. */
async function uploadToStorage(
  signedUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // fetch com stream não expõe progresso — usamos XMLHttpRequest.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", file.type || "text/csv");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload falhou: HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Erro de rede no upload."));
    xhr.send(file);
  });
}

/** Rótulos amigáveis de cada bucket (usados em cards e dropdowns). */
const BUCKET_LABEL: Record<CarBucket, string> = {
  AG_GESTOR: "Aguardando Gestor",
  PENDENTE: "Aguardando Empreendedor",
  VALIDADO: "Validados",
  CANCELADO: "Cancelados",
  SUSPENSO: "Suspensos",
  NAO_CLASSIFICADO: "Não classificados",
};

const BUCKET_COR: Record<CarBucket, string> = {
  AG_GESTOR: "text-[var(--danger)]",
  PENDENTE: "text-[var(--warning)]",
  VALIDADO: "text-[var(--success)]",
  CANCELADO: "text-[var(--text-muted)]",
  SUSPENSO: "text-[var(--text-muted)]",
  NAO_CLASSIFICADO: "text-[var(--warning)]",
};

/** Estados da máquina de importação. */
type Stage =
  | "idle"
  | "uploading"
  | "parsing"
  | "preview"
  | "committing"
  | "done"
  | "error";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface Props {
  anoDefault: number;
  mesDefault: number;
}

export function ImportarCarView({ anoDefault, mesDefault }: Props) {
  const [ano, setAno] = useState<number>(anoDefault);
  const [mes, setMes] = useState<number>(mesDefault);
  const [file, setFile] = useState<File | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [payload, setPayload] = useState<CarPreviewPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolucoes, setResolucoes] = useState<Record<string, CarBucket>>({});
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [doneStats, setDoneStats] = useState<{
    total: number;
    novasFases: number;
    status: "concluida" | "parcial";
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const anosDisponiveis = useMemo(() => {
    const y = new Date().getUTCFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const fasesPendentes = payload?.preview.fasesNaoClassificadas ?? [];
  const todasFasesResolvidas = fasesPendentes.every(
    (f) => resolucoes[f.fase] !== undefined,
  );

  /* ── Handlers ────────────────────────────────────────────────────────── */

  function reset() {
    setFile(null);
    setStoragePath(null);
    setUploadPct(0);
    setPayload(null);
    setErrorMsg(null);
    setResolucoes({});
    setOverwrite(false);
    setDoneStats(null);
    setStage("idle");
  }

  function handleFile(f: File) {
    setFile(f);
    setStoragePath(null);
    setUploadPct(0);
    setPayload(null);
    setResolucoes({});
    setOverwrite(false);
    setErrorMsg(null);
    setStage("uploading");

    startTransition(async () => {
      // 1. Pega URL assinada
      const signed = await postJson<{ path: string; signedUrl: string }>(
        "/api/car/importar/signed-url",
        { filename: f.name, ano, mes },
      );
      if (!signed.ok) {
        setErrorMsg(signed.error);
        setStage("error");
        toast.error(signed.error);
        return;
      }

      // 2. Upload direto pro Supabase Storage
      try {
        await uploadToStorage(signed.data.signedUrl, f, setUploadPct);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro no upload.";
        setErrorMsg(msg);
        setStage("error");
        toast.error(msg);
        return;
      }
      setStoragePath(signed.data.path);
      setStage("parsing");

      // 3. Parse + classify
      const res = await postJson<CarPreviewPayload>(
        "/api/car/importar/parse",
        { storagePath: signed.data.path, ano, mes },
      );
      if (res.ok) {
        setPayload(res.data);
        setStage("preview");
      } else {
        setErrorMsg(res.error);
        setStage("error");
        toast.error(res.error);
      }
    });
  }

  function handleResolucao(fase: string, bucket: CarBucket) {
    setResolucoes((prev) => ({ ...prev, [fase]: bucket }));
  }

  function handleCommit(opts: { forcarSemResolver?: boolean } = {}) {
    if (!storagePath || !file) return;
    if (fasesPendentes.length > 0 && !todasFasesResolvidas && !opts.forcarSemResolver) {
      toast.error("Classifique todas as fases novas antes de inserir.");
      return;
    }
    if (payload?.existente && !overwrite) {
      toast.error("Confirme a sobrescrita antes de inserir.");
      return;
    }

    setStage("committing");

    startTransition(async () => {
      const res = await postJson<CarCommitStats>("/api/car/importar/commit", {
        storagePath,
        filename: file.name,
        ano,
        mes,
        overwrite,
        resolucoes,
      });
      if (res.ok) {
        setDoneStats({
          total: res.data.totalRegistros,
          novasFases: res.data.novasFasesGravadas,
          status: res.data.status,
        });
        setStage("done");
        toast.success(
          `Importação de ${MESES[mes - 1]}/${ano} concluída — ${formatNumber(res.data.totalRegistros)} registros.`,
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

  /* ── Render ──────────────────────────────────────────────────────────── */

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
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Importar relatório do SICAR
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Envie o CSV bruto do SICAR (<code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">Relatorio-Buscar-Imoveis.csv</code>).
          O sistema valida colunas, classifica as fases contra o mapa persistente e mostra um preview antes de gravar.
        </p>
      </motion.div>

      {/* Período — sempre visível, define ano/mês do dataset */}
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

      {/* Idle → dropzone */}
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

        {stage === "uploading" && (
          <motion.div key="uploading" variants={fadeSlideUp} initial="hidden" animate="visible">
            <Card>
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center gap-4">
                  <Upload
                    className="h-8 w-8 animate-pulse text-[var(--accent)]"
                    strokeWidth={1.5}
                  />
                  <div className="flex-1">
                    <p className="font-medium">
                      Enviando arquivo pro storage…
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Upload direto pro Supabase (bypassa o body limit do Next).
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-[var(--text-muted)]">
                    {uploadPct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadPct}%` }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-[var(--accent)]"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "parsing" && (
          <motion.div key="parsing" variants={fadeSlideUp} initial="hidden" animate="visible">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <FileSpreadsheet
                  className="h-8 w-8 animate-pulse"
                  style={{ color: "#FF9F0A" }}
                  strokeWidth={1.5}
                />
                <div>
                  <p className="font-medium">Processando planilha…</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Baixando do storage, validando colunas obrigatórias e
                    classificando fases contra o mapa persistente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "preview" && payload && (
          <motion.div
            key="preview"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <PreviewPanel
              payload={payload}
              resolucoes={resolucoes}
              onResolve={handleResolucao}
              overwrite={overwrite}
              onOverwriteChange={setOverwrite}
              onCommit={handleCommit}
              onReset={reset}
              isPending={isPending}
              todasResolvidas={todasFasesResolvidas}
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
                  <p className="font-medium">Gravando importação…</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Persistindo registros em transação atômica no banco.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "done" && doneStats && (
          <motion.div key="done" variants={fadeSlideUp} initial="hidden" animate="visible">
            <DoneCard
              stats={doneStats}
              ano={ano}
              mes={mes}
              onReset={reset}
            />
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
      htmlFor="file-car"
      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center transition-colors hover:border-[#FF9F0A] hover:bg-[var(--surface)]"
    >
      <FileSpreadsheet className="h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.5} />
      <div>
        <p className="font-medium">Clique ou arraste o CSV do SICAR</p>
        <p className="text-sm text-[var(--text-muted)]">
          Formato aceito: <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">.csv</code> —
          colunas: Número do Recibo · Município · Situação do Imóvel · Fase do Processo
        </p>
      </div>
      <input
        id="file-car"
        type="file"
        accept=".csv,text/csv"
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

interface PreviewPanelProps {
  payload: CarPreviewPayload;
  resolucoes: Record<string, CarBucket>;
  onResolve: (fase: string, bucket: CarBucket) => void;
  overwrite: boolean;
  onOverwriteChange: (v: boolean) => void;
  onCommit: (opts?: { forcarSemResolver?: boolean }) => void;
  onReset: () => void;
  isPending: boolean;
  todasResolvidas: boolean;
  ano: number;
  mes: number;
}

function PreviewPanel({
  payload,
  resolucoes,
  onResolve,
  overwrite,
  onOverwriteChange,
  onCommit,
  onReset,
  isPending,
  todasResolvidas,
  ano,
  mes,
}: PreviewPanelProps) {
  const { preview, totalLinhas, linhasDescartadas, encoding, existente } = payload;
  const temFasesNovas = preview.fasesNaoClassificadas.length > 0;

  return (
    <div className="space-y-4">
      {/* Header do resultado */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {temFasesNovas ? (
              <>
                <AlertTriangle className="h-5 w-5 text-[var(--warning)]" strokeWidth={1.75} />
                <CardTitle className="text-base">
                  {preview.fasesNaoClassificadas.length} fase(s) nova(s) detectada(s)
                </CardTitle>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-[var(--success)]" strokeWidth={1.75} />
                <CardTitle className="text-base">Classificação concluída</CardTitle>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-[var(--text-muted)]">
          <p>
            <strong className="text-[var(--text)]">{formatNumber(totalLinhas)}</strong> registros ·{" "}
            {preview.fasesReconhecidas.length + preview.fasesNaoClassificadas.length} fases distintas ·
            {" "}encoding: {encoding}
            {linhasDescartadas > 0 && ` · ${linhasDescartadas} linha(s) descartada(s)`}
          </p>
          <p>Referência: {MESES[mes - 1]}/{ano}</p>
        </CardContent>
      </Card>

      {/* Sobrescrita — banner amarelo se já existe */}
      {existente && (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" strokeWidth={1.75} />
            <div className="flex-1 space-y-2 text-sm">
              <p>
                <strong>Já existe importação de {String(existente.mes).padStart(2,"0")}/{existente.ano}</strong>
                {" "}({formatNumber(existente.totalRegistros)} registros, gravada em{" "}
                {new Date(existente.importadoEm).toLocaleString("pt-BR")}).
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => onOverwriteChange(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-strong)]"
                />
                <span>Sobrescrever a importação existente ao inserir.</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prévia dos buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prévia dos buckets</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {CAR_BUCKETS_AGREGADOS.map((b) => {
            const n = preview.totalPorBucket[b];
            return (
              <div
                key={b}
                className="rounded-xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]"
              >
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {BUCKET_LABEL[b]}
                </p>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${BUCKET_COR[b]}`}>
                  {formatNumber(n)}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Fases não classificadas — dropdown por fase */}
      {temFasesNovas && (
        <Card className="border-[var(--warning)]/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#FF9F0A" }} strokeWidth={1.75} />
              <CardTitle className="text-base">
                Classifique as fases novas antes de inserir
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Estas fases não estão no mapa persistente. Escolha o bucket de cada uma —
              elas serão salvas em <code className="rounded bg-[var(--surface)] px-1 text-xs">car_fase_bucket_map</code>{" "}
              (origem: <em>manual</em>) e reconhecidas automaticamente na próxima importação.
            </p>
            <div className="space-y-2">
              {preview.fasesNaoClassificadas.map((f) => (
                <div
                  key={f.fase}
                  className="flex flex-col gap-2 rounded-lg border bg-[var(--surface)] p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.fase}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatNumber(f.count)} registro(s)
                    </p>
                  </div>
                  <Select
                    value={resolucoes[f.fase] ?? ""}
                    onValueChange={(v) => onResolve(f.fase, v as CarBucket)}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Escolha o bucket…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_BUCKETS_AGREGADOS.filter((b) => b !== "NAO_CLASSIFICADO").map(
                        (b) => (
                          <SelectItem key={b} value={b}>
                            {BUCKET_LABEL[b]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fases reconhecidas — collapsible por default */}
      {preview.fasesReconhecidas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Fases reconhecidas ({preview.fasesReconhecidas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {preview.fasesReconhecidas.slice(0, 20).map((f) => (
                <Badge
                  key={f.fase}
                  variant="outline"
                  title={`${f.fase} → ${BUCKET_LABEL[f.bucket]}`}
                >
                  <span className={BUCKET_COR[f.bucket]}>●</span>
                  <span className="ml-1 max-w-[220px] truncate">{f.fase}</span>
                  <span className="ml-1 text-[var(--text-muted)]">· {formatNumber(f.count)}</span>
                </Badge>
              ))}
              {preview.fasesReconhecidas.length > 20 && (
                <Badge variant="outline">
                  + {preview.fasesReconhecidas.length - 20} outra(s)
                </Badge>
              )}
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
        <Button
          variant="outline"
          onClick={() => {
            onReset();
          }}
          disabled={isPending}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
          Reimportar
        </Button>
        {temFasesNovas && (
          <Button
            variant="outline"
            onClick={() => onCommit({ forcarSemResolver: true })}
            disabled={isPending || (!!existente && !overwrite)}
            title="Grava os registros mantendo as fases novas como NÃO CLASSIFICADO — resolva depois."
          >
            Inserir sem classificar
          </Button>
        )}
        <Button
          onClick={() => onCommit()}
          disabled={
            isPending ||
            (temFasesNovas && !todasResolvidas) ||
            (!!existente && !overwrite)
          }
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
  ano,
  mes,
  onReset,
}: {
  stats: { total: number; novasFases: number; status: "concluida" | "parcial" };
  ano: number;
  mes: number;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" strokeWidth={1.75} />
          <CardTitle className="text-base">
            Importação de {MESES[mes - 1]}/{ano}{" "}
            {stats.status === "parcial" ? "gravada com fases não classificadas" : "concluída"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Registros gravados
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(stats.total)}
            </p>
          </div>
          <div className="rounded-xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Fases novas mapeadas
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(stats.novasFases)}
            </p>
          </div>
          <div className="rounded-xl border bg-[var(--elevated)] p-3 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Status
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${
                stats.status === "concluida"
                  ? "text-[var(--success)]"
                  : "text-[var(--warning)]"
              }`}
            >
              {stats.status === "concluida" ? "Concluída" : "Parcial"}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onReset}>
            Nova importação
          </Button>
          <Link href="/car">
            <Button>Ver dashboard</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
