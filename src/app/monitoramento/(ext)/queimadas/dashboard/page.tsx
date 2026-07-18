import { Flame } from "lucide-react";

import { ANO_MIN, TEMA_COR, anoRecenteCompleto } from "@/lib/monit-ext/constants";
import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
  getQueimadasMunicipiosAgregado,
  getQueimadasMunicipiosAno,
  getQueimadasMunicipiosEmAlerta,
  getQueimadasRecorrentes,
  getQueimadasSazonalidadePorClasse,
  getQueimadasSerieAnual,
  getQueimadasTopMunicipios,
} from "@/lib/monit-ext/queries";

import { QueimadasDashboardView } from "./queimadas-dashboard-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ano?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const serie = await getQueimadasSerieAnual();
  if (serie.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-3xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
        <Flame className="h-12 w-12" style={{ color: TEMA_COR.queimadas }} strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Queimadas — sem dados
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Aguardando primeira sincronização.
        </p>
      </div>
    );
  }

  const anosDisponiveis = serie.map((s) => s.ano).filter((a) => a >= ANO_MIN);
  const anoCompleto = anoRecenteCompleto();
  // Default: ano mais recente completo se estiver na série; senão, cai no maior ano ingerido.
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

  // Banner de alerta, sazonalidade por classe e IPA seguem sendo o retrato do
  // ano mais recente quando "all" (são leituras datadas). Já o mapa + ranking
  // municipal passam a somar a série inteira (ver abaixo), pra ficarem
  // coerentes com o KPI "Área queimada" que também agrega.
  const anoConsultas = anoAtual === "all" ? anosDisponiveis.at(-1)! : anoAtual;

  const [emAlerta, sazonalidade, recorrentes, ipa] = await Promise.all([
    getQueimadasMunicipiosEmAlerta(anoConsultas),
    getQueimadasSazonalidadePorClasse(anoConsultas),
    getQueimadasRecorrentes(),
    getIpaRanking(anoConsultas, 15),
  ]);

  let todos;
  let top;
  if (anoAtual === "all") {
    todos = await getQueimadasMunicipiosAgregado();
    top = [...todos]
      .sort(
        (a, b) =>
          Number(b.areaQueimadaTotalHa) - Number(a.areaQueimadaTotalHa),
      )
      .slice(0, 20);
  } else {
    [top, todos] = await Promise.all([
      getQueimadasTopMunicipios(anoConsultas, 20),
      getQueimadasMunicipiosAno(anoConsultas),
    ]);
  }

  return (
    <QueimadasDashboardView
      serie={serie}
      topMunicipios={top}
      emAlerta={emAlerta}
      municipiosAno={todos}
      sazonalidade={sazonalidade}
      recorrentes={recorrentes}
      ipaRanking={ipa}
      anoAtual={anoAtual}
      anosDisponiveis={anosDisponiveis}
      anoParcial={anoAtual !== "all" && anoAtual > anoCompleto}
    />
  );
}
