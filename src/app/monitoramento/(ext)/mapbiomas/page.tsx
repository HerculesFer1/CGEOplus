import Link from "next/link";
import { Sprout } from "lucide-react";
import { addMonths, differenceInDays, isBefore } from "date-fns";

import { KpiAncora } from "@/components/monit-ext/kpi-ancora";
import { Button } from "@/components/ui/button";
import { CRONOGRAMA, TEMA_COR, anoRecenteCompleto } from "@/lib/monit-ext/constants";
import {
  getMapbiomasSerieAnual,
  getMapbiomasTopMunicipios,
  getUltimasExecucoes,
} from "@/lib/monit-ext/queries";
import { formatNumber } from "@/lib/utils";

import { MapbiomasLandingCharts } from "./landing-charts";

export const dynamic = "force-dynamic";

const COR = TEMA_COR.mapbiomas;

export default async function Page() {
  const [serie, execucoes] = await Promise.all([
    getMapbiomasSerieAnual(),
    getUltimasExecucoes(),
  ]);

  if (serie.length === 0) {
    return <EmptyState />;
  }

  // Ano-âncora da landing = último ano completo (evita mostrar ano corrente
  // parcial como retrato oficial). Se a série ainda não tem esse ano, cai
  // no último ingerido.
  const anoCompleto = anoRecenteCompleto();
  const atual = serie.find((s) => s.ano === anoCompleto) ?? serie[serie.length - 1];
  const atualIdx = serie.findIndex((s) => s.ano === atual.ano);
  const anterior = atualIdx > 0 ? serie[atualIdx - 1] : null;
  const top = await getMapbiomasTopMunicipios(atual.ano, 6);
  const ipiAtual = Number(atual.ipiPct);
  const ipiAnterior = anterior ? Number(anterior.ipiPct) : null;
  const deltaIpi = ipiAnterior !== null ? Number((ipiAtual - ipiAnterior).toFixed(1)) : null;

  const critico = top.rows[0];
  const criticoValor = critico
    ? `${formatNumber(Math.round(Number(critico.haIrregular)))} ha irregulares em ${critico.ano}`
    : null;

  const ultimaExec = execucoes.find((e) => e.fonte === "mapbiomas");
  const now = new Date();
  const ultima = ultimaExec?.executadoEm
    ? formatRelDays(ultimaExec.executadoEm, now, "há")
    : "aguardando 1º sync";
  const proxima = formatRelDays(proximaMapbiomas(now), now, "em");

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          <Sprout className="h-3.5 w-3.5" style={{ color: COR }} strokeWidth={2} />
          Monitoramento externo
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Alertas <span style={{ color: COR }}>MapBiomas</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Desmatamento detectado no Piauí cruzado com autorizações (ASV/SINAFLOR)
          e regularizações (DERADSA/SEMARH). O IPI mede a fração de área sem
          instrumento ambiental válido.
        </p>
      </header>

      <KpiAncora
        kpiLabel={`IPI · Índice de Pressão Irregular (${atual.ano})`}
        kpiValor={ipiAtual.toFixed(1)}
        kpiSufixo="%"
        kpiCorTema={COR}
        kpiDescricao="Fração da área desmatada sem instrumento ambiental válido. Queda consistente indica avanço do saneamento fundiário-ambiental."
        deltaLabel={`Variação vs. ${anterior?.ano ?? "—"}`}
        deltaValor={deltaIpi}
        deltaSufixo="pp"
        positivoBom={false}
        municipioCriticoNome={critico?.municipio ?? null}
        municipioCriticoValor={criticoValor}
        municipioCriticoLink={`/monitoramento/processos?municipio=${encodeURIComponent(critico?.municipio ?? "")}`}
        proximaAtualizacaoLabel={proxima}
        ultimaAtualizacaoLabel={ultima}
        dashboardHref="/monitoramento/mapbiomas/dashboard"
        dashboardCta="Ver dashboard completo"
      />

      <MapbiomasLandingCharts serie={serie} top={top.rows} corTema={COR} />

      <section className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Explorar mais fundo</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              O dashboard completo abre em modo apresentação com 4 slides —
              visão executiva, evolução temporal, panorama municipal e análise
              comparativa. Inclui a seção CGEO+ com o perfil unificado do
              município e o IPA composto.
            </p>
          </div>
          <Button asChild>
            <Link href="/monitoramento/mapbiomas/dashboard">Abrir dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
      <Sprout className="h-12 w-12" style={{ color: COR }} strokeWidth={1.5} />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          MapBiomas — sem dados sincronizados
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma sync do upstream ainda. Rode o cron manualmente ou aguarde
          a próxima janela mensal (dia 6, 04h UTC).
        </p>
      </div>
    </div>
  );
}

function proximaMapbiomas(now: Date): Date {
  const target = new Date(now.getFullYear(), now.getMonth(), CRONOGRAMA.mapbiomas.diaLiberacaoUpstream);
  return isBefore(target, now) ? addMonths(target, 1) : target;
}

function formatRelDays(date: Date, now: Date, prefixo: "em" | "há"): string {
  const diff = differenceInDays(date, now);
  const abs = Math.abs(diff);
  if (abs === 0) return prefixo === "em" ? "hoje" : "agora";
  if (abs < 30) return `${prefixo} ${abs}d`;
  const meses = Math.round(abs / 30);
  return `${prefixo} ${meses}${meses === 1 ? " mês" : " meses"}`;
}
