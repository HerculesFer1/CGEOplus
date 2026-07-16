import { Sprout } from "lucide-react";

import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
  getMapbiomasMunicipiosAno,
  getMapbiomasSerieAnual,
  getMapbiomasSerieMensal,
  getMapbiomasTopMunicipios,
} from "@/lib/monit-ext/queries";
import { ANO_MIN, TEMA_COR, anoRecenteCompleto } from "@/lib/monit-ext/constants";

import { MapbiomasDashboardView } from "./mapbiomas-dashboard-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ano?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const serie = await getMapbiomasSerieAnual();
  if (serie.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
        <Sprout className="h-12 w-12" style={{ color: TEMA_COR.mapbiomas }} strokeWidth={1.5} />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard MapBiomas — sem dados
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Aguardando primeira sincronização.
          </p>
        </div>
      </div>
    );
  }

  const anosDisponiveis = serie.map((s) => s.ano).filter((a) => a >= ANO_MIN);
  const anoCompleto = anoRecenteCompleto();
  const anoDefault = anosDisponiveis.includes(anoCompleto)
    ? anoCompleto
    : anosDisponiveis.at(-1)!;

  const params = await searchParams;
  const anoQuery = params.ano ? Number(params.ano) : null;
  const anoAtual =
    anoQuery !== null && anosDisponiveis.includes(anoQuery) ? anoQuery : anoDefault;

  const [mensal, top, ipa, municipios] = await Promise.all([
    getMapbiomasSerieMensal(),
    getMapbiomasTopMunicipios(anoAtual, 20),
    getIpaRanking(anoAtual, 15),
    getMapbiomasMunicipiosAno(anoAtual),
  ]);

  return (
    <MapbiomasDashboardView
      serie={serie}
      mensal={mensal}
      topMunicipios={top.rows}
      municipiosAtual={municipios}
      ipaRanking={ipa}
      anoAtual={anoAtual}
      anosDisponiveis={anosDisponiveis}
      anoParcial={anoAtual > anoCompleto}
    />
  );
}
