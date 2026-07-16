import { Satellite } from "lucide-react";

import { TEMA_COR } from "@/lib/monit-ext/constants";
import { getIpaRanking } from "@/lib/monit-ext/ipa";
import {
  getProdesCiclos,
  getProdesCobertura,
  getProdesTopMunicipios,
  getProdesVetorPressao,
} from "@/lib/monit-ext/queries";

import { ProdesDashboardView } from "./prodes-dashboard-view";

export const dynamic = "force-dynamic";

export default async function Page() {
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

  const anoAtual = topMun[0]?.ano ?? ciclos.at(-1)?.anoProdesRef ?? 2025;
  const ipa = await getIpaRanking(anoAtual, 15);

  return (
    <ProdesDashboardView
      ciclos={ciclos}
      vetores={vetores}
      cobertura={cobertura}
      topMunicipios={topMun}
      ipaRanking={ipa}
      anoAtual={anoAtual}
    />
  );
}
