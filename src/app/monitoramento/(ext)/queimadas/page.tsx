import Link from "next/link";
import { AlertTriangle, FileText, Flame } from "lucide-react";
import { addMonths, differenceInDays, isBefore } from "date-fns";

import { KpiAncora } from "@/components/monit-ext/kpi-ancora";
import { Button } from "@/components/ui/button";
import { CRONOGRAMA, TEMA_COR } from "@/lib/monit-ext/constants";
import {
  getQueimadasMunicipiosEmAlerta,
  getQueimadasSerieAnual,
  getQueimadasTopMunicipios,
  getUltimasExecucoes,
} from "@/lib/monit-ext/queries";
import { formatNumber } from "@/lib/utils";

import { QueimadasLandingCharts } from "./landing-charts";

export const dynamic = "force-dynamic";

const COR = TEMA_COR.queimadas;

export default async function Page() {
  const [serie, execs] = await Promise.all([
    getQueimadasSerieAnual(),
    getUltimasExecucoes(),
  ]);

  if (serie.length === 0) return <EmptyState />;

  const atual = serie.at(-1)!;
  const anterior = serie.length >= 2 ? serie[serie.length - 2] : null;
  const [top, emAlerta] = await Promise.all([
    getQueimadasTopMunicipios(atual.ano, 6),
    getQueimadasMunicipiosEmAlerta(atual.ano),
  ]);

  const areaAtual = Number(atual.areaQueimadaHa);
  const areaAnt = anterior ? Number(anterior.areaQueimadaHa) : null;
  const deltaArea = areaAnt !== null ? Math.round(areaAtual - areaAnt) : null;

  const critico = emAlerta[0] ?? top[0] ?? null;
  const criticoValor = critico
    ? `${formatNumber(Math.round(Number(critico.areaQueimadaTotalHa)))} ha · classe AHP ${critico.classeMaxQueimada ?? "—"}${critico.emAlerta ? " · em alerta CGEO+" : ""}`
    : null;

  const ultima = execs.find((e) => e.fonte === "queimadas");
  const now = new Date();

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          <Flame className="h-3.5 w-3.5" style={{ color: COR }} strokeWidth={2} />
          Monitoramento externo
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text)]">
          <span style={{ color: COR }}>Queimadas</span> INPE
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Cicatrizes de queimadas (AQ1km V6 Coleção 2 · INPE) cruzadas com as 5
          classes AHP de prioridade ambiental. O foco institucional é onde o
          fogo encontra áreas prioritárias — classes 4 e 5.
        </p>
      </header>

      <KpiAncora
        kpiLabel={`Municípios em alerta CGEO+ · ${atual.ano}`}
        kpiValor={String(emAlerta.length)}
        kpiSufixo={`/ ${atual.nMunicipiosAfetados} afetados`}
        kpiCorTema={COR}
        kpiDescricao="Critério CGEO+: classe AHP máxima 4-5 combinada com mais de 50% da área queimada dentro de zonas prioritárias. Onde o fogo pressiona conservação."
        deltaLabel={`Variação de área queimada vs. ${anterior?.ano ?? "—"}`}
        deltaValor={deltaArea}
        deltaSufixo="ha"
        positivoBom={false}
        municipioCriticoNome={critico?.municipioNome ?? null}
        municipioCriticoValor={criticoValor}
        municipioCriticoLink={`/monitoramento/processos?municipio=${encodeURIComponent(critico?.municipioNome ?? "")}`}
        municipioCriticoIcon={FileText}
        proximaAtualizacaoLabel={formatRel(proximaQueimadas(now), now, "em")}
        ultimaAtualizacaoLabel={ultima?.executadoEm ? formatRel(ultima.executadoEm, now, "há") : "aguardando 1º sync"}
        dashboardHref="/monitoramento/queimadas/dashboard"
        dashboardCta="Ver dashboard completo"
      />

      {/* Banner de alerta CGEO+ — destaque para o que MAIS importa neste módulo */}
      <section className="rounded-3xl border border-red-500/25 bg-red-500/5 p-6">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[var(--text)]">
              {emAlerta.length} municípios em pressão crítica em {atual.ano}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
              Estes municípios tiveram fogo em classes prioritárias (AHP 4 ou 5)
              cobrindo mais de metade da sua área queimada — combinação que o
              CGEO+ marca para triagem imediata da equipe de campo.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {emAlerta.slice(0, 12).map((m) => (
                <span
                  key={m.municipioCod}
                  className="rounded-full border border-red-500/30 bg-[var(--elevated)] px-2.5 py-0.5 text-[11px] text-[var(--text)]"
                  title={`${formatNumber(Math.round(Number(m.areaQueimadaTotalHa)))} ha · classe ${m.classeMaxQueimada}`}
                >
                  {m.municipioNome}
                </span>
              ))}
              {emAlerta.length > 12 && (
                <span className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                  +{emAlerta.length - 12}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <QueimadasLandingCharts serie={serie} top={top} corTema={COR} />

      <section className="rounded-2xl border bg-[var(--elevated)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Explorar mais fundo</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              6 slides — visão geral, por classe AHP, panorama municipal,
              evolução mensal, série anual e recorrência — com leitura CGEO+
              cruzando IPA e assinatura ambiental do município.
            </p>
          </div>
          <Button asChild>
            <Link href="/monitoramento/queimadas/dashboard">Abrir dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
      <Flame className="h-12 w-12" style={{ color: COR }} strokeWidth={1.5} />
      <h1 className="text-2xl font-semibold tracking-tight">Queimadas — sem dados sincronizados</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Aguarde a próxima janela mensal (dia 15, 04h UTC).
      </p>
    </div>
  );
}

function proximaQueimadas(now: Date): Date {
  const target = new Date(now.getFullYear(), now.getMonth(), CRONOGRAMA.queimadas.diaLiberacaoUpstream);
  return isBefore(target, now) ? addMonths(target, 1) : target;
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
