import { getDashboardService } from "@/lib/services/dashboard.service";

import { ProdutividadeView } from "./produtividade-view";

export const dynamic = "force-dynamic";

export default async function ProdutividadePage() {
  const svc = getDashboardService();

  const [servidores, mensal, sistemas] = await Promise.all([
    svc.getProdutividadeServidores(20),
    svc.getAnalisesPorMes(6),
    svc.getDistribuicaoPorSistema(),
  ]);

  return (
    <ProdutividadeView
      servidores={servidores}
      mensal={mensal}
      sistemas={sistemas}
    />
  );
}
