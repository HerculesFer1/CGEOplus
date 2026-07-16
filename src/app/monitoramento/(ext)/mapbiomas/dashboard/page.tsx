import { Sprout } from "lucide-react";

import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
  getMapbiomasMunicipiosAno,
  getMapbiomasSerieAnual,
  getMapbiomasSerieMensal,
  getMapbiomasTopMunicipios,
} from "@/lib/monit-ext/queries";
import { TEMA_COR } from "@/lib/monit-ext/constants";

import { MapbiomasDashboardView } from "./mapbiomas-dashboard-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [serie, mensal, top, ipa] = await Promise.all([
    getMapbiomasSerieAnual(),
    getMapbiomasSerieMensal(),
    getMapbiomasTopMunicipios(20),
    getIpaRanking(await ultimoAno(), 15),
  ]);

  const anoAtual = serie.at(-1)?.ano ?? null;
  const municipios = anoAtual ? await getMapbiomasMunicipiosAno(anoAtual) : [];

  if (serie.length === 0 || !anoAtual) {
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

  return (
    <MapbiomasDashboardView
      serie={serie}
      mensal={mensal}
      topMunicipios={top.rows}
      municipiosAtual={municipios}
      ipaRanking={ipa}
      anoAtual={anoAtual}
    />
  );
}

async function ultimoAno(): Promise<number> {
  const serie = await getMapbiomasSerieAnual();
  return serie.at(-1)?.ano ?? new Date().getFullYear();
}
