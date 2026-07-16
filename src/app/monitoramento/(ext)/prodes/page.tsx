import Link from "next/link";
import { FileText, Satellite } from "lucide-react";
import { addYears, differenceInDays, isBefore } from "date-fns";

import { KpiAncora } from "@/components/monit-ext/kpi-ancora";
import { Button } from "@/components/ui/button";
import { CRONOGRAMA, TEMA_COR } from "@/lib/monit-ext/constants";
import {
  getProdesCiclos,
  getProdesTopMunicipios,
  getUltimasExecucoes,
} from "@/lib/monit-ext/queries";
import { formatNumber } from "@/lib/utils";

import { ProdesLandingCharts } from "./landing-charts";

export const dynamic = "force-dynamic";

const COR = TEMA_COR.prodes;

export default async function Page() {
  const [ciclos, topMun, execs] = await Promise.all([
    getProdesCiclos(),
    getProdesTopMunicipios(),
    getUltimasExecucoes(),
  ]);

  if (ciclos.length === 0) return <EmptyState />;

  const publicados = ciclos.filter((c) => c.pctConcordancia !== null);
  const atual = publicados[publicados.length - 1] ?? ciclos[ciclos.length - 1];
  const anterior = publicados.length >= 2 ? publicados[publicados.length - 2] : null;

  const pctAtual = atual.pctConcordancia !== null ? Number(atual.pctConcordancia) : null;
  const pctAnt = anterior?.pctConcordancia !== null ? Number(anterior?.pctConcordancia ?? 0) : null;
  const deltaPct =
    pctAtual !== null && pctAnt !== null ? Number((pctAtual - pctAnt).toFixed(1)) : null;

  const critico = topMun[0] ?? null;
  const criticoValor = critico
    ? `${Number(critico.pctConcordancia ?? 0).toFixed(0)}% concordância · ${formatNumber(Math.round(Number(critico.totalHa)))} ha`
    : null;

  const ultima = execs.find((e) => e.fonte === "prodes");
  const now = new Date();

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          <Satellite className="h-3.5 w-3.5" style={{ color: COR }} strokeWidth={2} />
          Monitoramento externo
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)]">
          <span style={{ color: COR }}>PRODES</span> Cerrado
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Validação cruzada dos alertas MapBiomas com os polígonos consolidados
          do PRODES-Cerrado (INPE). A concordância mede o alinhamento entre
          duas fontes independentes de detecção.
        </p>
      </header>

      <KpiAncora
        kpiLabel={`Concordância PRODES × MapBiomas · ciclo ${atual.anoProdesRef}`}
        kpiValor={pctAtual !== null ? pctAtual.toFixed(1) : "—"}
        kpiSufixo="%"
        kpiCorTema={COR}
        kpiDescricao="Fração dos alertas MapBiomas confirmados pelo PRODES no ciclo anual. Aumento indica maior alinhamento entre fontes."
        deltaLabel={`Variação vs. ${anterior?.anoProdesRef ?? "—"}`}
        deltaValor={deltaPct}
        deltaSufixo="pp"
        positivoBom
        municipioCriticoNome={critico?.municipio ?? null}
        municipioCriticoValor={criticoValor}
        municipioCriticoLink={`/monitoramento/processos?municipio=${encodeURIComponent(critico?.municipio ?? "")}`}
        municipioCriticoIcon={FileText}
        proximaAtualizacaoLabel={formatRel(proximaProdes(now), now, "em")}
        ultimaAtualizacaoLabel={
          ultima?.executadoEm ? formatRel(ultima.executadoEm, now, "há") : "aguardando 1º sync"
        }
        dashboardHref="/monitoramento/prodes/dashboard"
        dashboardCta="Ver dashboard completo"
      />

      <ProdesLandingCharts ciclos={ciclos} top={topMun} corTema={COR} />

      <section className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Explorar mais fundo</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              5 slides — visão geral, evolução temporal, panorama municipal,
              vetor de pressão e distribuição de cobertura — mais a leitura
              CGEO+ com IPA composto e assinatura ambiental.
            </p>
          </div>
          <Button asChild>
            <Link href="/monitoramento/prodes/dashboard">Abrir dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
      <Satellite className="h-12 w-12" style={{ color: COR }} strokeWidth={1.5} />
      <h1 className="text-2xl font-semibold tracking-tight">PRODES — sem dados sincronizados</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Base anual do INPE. Aguarde a próxima janela (2 de outubro, 04h UTC).
      </p>
    </div>
  );
}

function proximaProdes(now: Date): Date {
  const target = new Date(now.getFullYear(), CRONOGRAMA.prodes.mesLiberacaoUpstream - 1, CRONOGRAMA.prodes.diaLiberacaoUpstream);
  return isBefore(target, now) ? addYears(target, 1) : target;
}

function formatRel(date: Date, now: Date, prefixo: "em" | "há"): string {
  const diff = differenceInDays(date, now);
  const abs = Math.abs(diff);
  if (abs === 0) return prefixo === "em" ? "hoje" : "agora";
  if (abs < 30) return `${prefixo} ${abs}d`;
  if (abs < 365) {
    const meses = Math.round(abs / 30);
    return `${prefixo} ${meses}${meses === 1 ? " mês" : " meses"}`;
  }
  const anos = Math.round(abs / 365);
  return `${prefixo} ${anos}${anos === 1 ? " ano" : " anos"}`;
}

