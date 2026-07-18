import { Sprout } from "lucide-react";

import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
  getMapbiomasMunicipiosAgregado,
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
  const rawAno = params.ano;
  const anoAtual: number | "all" =
    rawAno === "all"
      ? "all"
      : rawAno && anosDisponiveis.includes(Number(rawAno))
        ? Number(rawAno)
        : anoDefault;

  // IPA continua sendo o retrato do ano mais recente com dados quando "all"
  // (é um score institucional datado, não um acumulado).
  const anoConsultas = anoAtual === "all" ? anosDisponiveis.at(-1)! : anoAtual;

  const [mensal, ipa] = await Promise.all([
    getMapbiomasSerieMensal(),
    getIpaRanking(anoConsultas, 15),
  ]);

  // Mapa + ranking: em "Todos os anos" somamos por município a série inteira
  // (coerente com os KPIs); em ano específico, o snapshot daquele ano.
  let municipios;
  let topRows;
  if (anoAtual === "all") {
    municipios = await getMapbiomasMunicipiosAgregado();
    topRows = [...municipios]
      .sort((a, b) => Number(b.haIrregular) - Number(a.haIrregular))
      .slice(0, 20);
  } else {
    const [top, municipiosAno] = await Promise.all([
      getMapbiomasTopMunicipios(anoConsultas, 20),
      getMapbiomasMunicipiosAno(anoConsultas),
    ]);
    municipios = municipiosAno;
    topRows = top.rows;
  }

  return (
    <MapbiomasDashboardView
      serie={serie}
      mensal={mensal}
      topMunicipios={topRows}
      municipiosAtual={municipios}
      ipaRanking={ipa}
      anoAtual={anoAtual}
      anosDisponiveis={anosDisponiveis}
      anoParcial={anoAtual !== "all" && anoAtual > anoCompleto}
    />
  );
}
