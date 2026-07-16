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
  const rawAno = params.ano;
  const anoAtual: number | "all" =
    rawAno === "all"
      ? "all"
      : rawAno && anosDisponiveis.includes(Number(rawAno))
        ? Number(rawAno)
        : anoDefault;

  // Para queries que precisam de um ano específico (mapa, ranking, IPA),
  // resolvemos "all" ao último ano com dados — o "retrato mais recente"
  // é mais útil do que agregar município × ano no mapa.
  const anoConsultas = anoAtual === "all" ? anosDisponiveis.at(-1)! : anoAtual;

  const [mensal, top, ipa, municipios] = await Promise.all([
    getMapbiomasSerieMensal(),
    getMapbiomasTopMunicipios(anoConsultas, 20),
    getIpaRanking(anoConsultas, 15),
    getMapbiomasMunicipiosAno(anoConsultas),
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
      anoParcial={anoAtual !== "all" && anoAtual > anoCompleto}
    />
  );
}
