import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getCarConfig,
  getSerieHistorica,
  getUfRanking,
  getUltimaImportacao,
  listImportacoesHistorico,
} from "@/lib/car/queries";

import { CarDashboardView } from "./car-dashboard-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const ultima = await getUltimaImportacao();

  if (!ultima) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 rounded-2xl border bg-[var(--elevated)] p-12 text-center shadow-[var(--shadow-sm)]">
        <FileSpreadsheet
          className="h-12 w-12"
          style={{ color: "#FF9F0A" }}
          strokeWidth={1.5}
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Painel CAR — sem dados ainda
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Nenhuma importação do SICAR foi processada. Comece enviando o
            relatório mais recente (Relatório-Buscar-Imóveis).
          </p>
        </div>
        <Link href="/car/importar">
          <Button>Importar primeira planilha</Button>
        </Link>
      </div>
    );
  }

  const [historico, ufRanking, serieHistorica, config] = await Promise.all([
    listImportacoesHistorico(),
    getUfRanking(ultima.ano, ultima.mes),
    getSerieHistorica(),
    getCarConfig(),
  ]);

  return (
    <CarDashboardView
      ultima={ultima}
      historico={historico}
      ufRanking={ufRanking}
      serieHistorica={serieHistorica}
      config={config}
    />
  );
}
