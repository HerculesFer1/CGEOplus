import { Flame } from "lucide-react";

import { TEMA_COR } from "@/lib/monit-ext/constants";
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

export default async function Page() {
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

  const anoAtual = serie.at(-1)!.ano;
  const [top, emAlerta, todos, sazonalidade, recorrentes, ipa] = await Promise.all([
    getQueimadasTopMunicipios(anoAtual, 20),
    getQueimadasMunicipiosEmAlerta(anoAtual),
    getQueimadasMunicipiosAno(anoAtual),
    getQueimadasSazonalidadePorClasse(anoAtual),
    getQueimadasRecorrentes(),
    getIpaRanking(anoAtual, 15),
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
    />
  );
}
