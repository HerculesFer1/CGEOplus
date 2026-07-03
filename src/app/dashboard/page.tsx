import { getDashboardService } from "@/lib/services/dashboard.service";
import { DashboardOverview } from "./dashboard-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const svc = getDashboardService();

  const [kpis, mensal, sistemas, top] = await Promise.all([
    svc.getKpisOverview(),
    svc.getAnalisesPorMes(12),
    svc.getDistribuicaoPorSistema(),
    svc.getProdutividadeServidores(6),
  ]);

  return (
    <DashboardOverview
      kpis={kpis}
      mensal={mensal}
      sistemas={sistemas}
      topServidores={top}
    />
  );
}
