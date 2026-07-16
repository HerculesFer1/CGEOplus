import { Flame } from "lucide-react";

import { ANO_MIN, TEMA_COR, anoRecenteCompleto } from "@/lib/monit-ext/constants";
import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
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

  // Queries que precisam de um ano específico usam o retrato mais recente
  // quando "all" — evita agregar município × ano no mapa, o que seria
  // ambíguo (é a intensidade por município ao longo dos anos?).
  const anoConsultas = anoAtual === "all" ? anosDisponiveis.at(-1)! : anoAtual;

  const [top, emAlerta, todos, sazonalidade, recorrentes, ipa] = await Promise.all([
    getQueimadasTopMunicipios(anoConsultas, 20),
    getQueimadasMunicipiosEmAlerta(anoConsultas),
    getQueimadasMunicipiosAno(anoConsultas),
    getQueimadasSazonalidadePorClasse(anoConsultas),
    getQueimadasRecorrentes(),
    getIpaRanking(anoConsultas, 15),
  ]);

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
