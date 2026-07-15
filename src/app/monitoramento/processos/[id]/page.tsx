import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getProcessosService } from "@/lib/services/processos.factory";
import { formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProcessoNotFoundError } from "@/lib/services/processos.service";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const RESULT_COLORS: Record<string, "success" | "warning" | "danger" | "default"> = {
  Finalizado: "success",
  "Analisado com pendencia": "warning",
  Indeferido: "danger",
  Desarquivado: "default",
};

export default async function ProcessoDetalhePage({ params }: Props) {
  const { id } = await params;
  const svc = getProcessosService();

  try {
    const processo = await svc.get(id);
    const analises = await svc.listAnalises(id);

    return (
      <div className="space-y-8">
        <div>
          <Link
            href="/monitoramento/processos"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos processos
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Processo</p>
              <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                {processo.numero}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="accent">{processo.sistema}</Badge>
                {processo.sicarFinalidade && (
                  <Badge variant="outline">{processo.sicarFinalidade}</Badge>
                )}
                <Badge>{processo.statusAtual.replace("_", " ")}</Badge>
              </div>
            </div>
            <div className="rounded-2xl border bg-[var(--elevated)] p-4 text-right shadow-[var(--shadow-sm)]">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Análises
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {formatNumber(processo.totalAnalises)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InfoField label="Data de entrada" value={formatDate(processo.dataEntrada)} />
          <InfoField label="Última análise" value={processo.ultimaAnalise ? formatDate(processo.ultimaAnalise) : "—"} />
          <InfoField label="Requerente" value={processo.requerente ?? "—"} />
          <InfoField label="Município" value={processo.municipio ?? "—"} />
          <InfoField label="Observações" value={processo.observacoes ?? "—"} className="md:col-span-2" />
        </div>

        <section>
          <h2 className="text-lg font-semibold">Histórico de análises</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {analises.length} análise(s) registrada(s), da mais recente para a mais antiga.
          </p>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Analista</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Setor destino</TableHead>
                  <TableHead>Obs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analises.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-[var(--text-muted)]">
                      {a.numeroOrdem}
                    </TableCell>
                    <TableCell>{formatDate(a.dataAnalise)}</TableCell>
                    <TableCell className="font-medium">{a.servidorApelido}</TableCell>
                    <TableCell>
                      <Badge variant={RESULT_COLORS[a.resultado] ?? "default"}>
                        {a.resultado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {a.setorDestino ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)] max-w-xs truncate">
                      {a.observacoes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    );
  } catch (err) {
    if (err instanceof ProcessoNotFoundError) notFound();
    throw err;
  }
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-[var(--elevated)] p-4 shadow-[var(--shadow-sm)] ${className ?? ""}`}>
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
