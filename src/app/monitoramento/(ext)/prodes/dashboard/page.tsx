import { Satellite } from "lucide-react";

import { ANO_MIN, TEMA_COR, anoRecenteCompleto } from "@/lib/monit-ext/constants";
import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
  getProdesCiclos,
  getProdesCobertura,
  getProdesTopMunicipios,
  getProdesVetorPressao,
} from "@/lib/monit-ext/queries";

import { ProdesDashboardView } from "./prodes-dashboard-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ano?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const [ciclos, vetores, cobertura, topMun] = await Promise.all([
    getProdesCiclos(),
    getProdesVetorPressao(),
    getProdesCobertura(),
    getProdesTopMunicipios(),
  ]);

  if (ciclos.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
        <Satellite className="h-12 w-12" style={{ color: TEMA_COR.prodes }} strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard PRODES — sem dados
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Aguardando primeira sincronização.
        </p>
      </div>
    );
  }

  const anosDisponiveis = ciclos
    .map((c) => c.anoProdesRef)
    .filter((a) => a >= ANO_MIN)
    .sort((a, b) => a - b);

  const publicados = ciclos.filter((c) => c.nTotal > 0);
  const anoCompleto = anoRecenteCompleto();
  // Default = último ano PUBLICADO (com validação cruzada concluída) que
  // não seja mais recente do que o ano completo. Evita cair em 2026 vazio.
  const anoDefault =
    publicados.filter((c) => c.anoProdesRef <= anoCompleto).at(-1)?.anoProdesRef ??
    publicados.at(-1)?.anoProdesRef ??
    ciclos.at(-1)!.anoProdesRef;

  const params = await searchParams;
  const rawAno = params.ano;
  const anoAtual: number | "all" =
    rawAno === "all"
      ? "all"
      : rawAno && anosDisponiveis.includes(Number(rawAno))
        ? Number(rawAno)
        : anoDefault;

  const anoConsultas = anoAtual === "all" ? anoDefault : anoAtual;
  const ipa = await getIpaRanking(anoConsultas, 15);

  return (
    <ProdesDashboardView
      ciclos={ciclos}
      vetores={vetores}
      cobertura={cobertura}
      topMunicipios={topMun}
      ipaRanking={ipa}
      anoAtual={anoAtual}
      anosDisponiveis={anosDisponiveis}
      anoParcial={anoAtual !== "all" && anoAtual > anoCompleto}
    />
  );
}
