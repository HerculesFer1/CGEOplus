import { getDashboardService } from "@/lib/services/dashboard.service";
import { eventosService } from "@/lib/services/eventos.service";
import { metasService, periodoAtual } from "@/lib/services/metas.service";

import { DashboardOverview } from "./dashboard-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const svc = getDashboardService();
  const per = periodoAtual();

  const [
    kpis,
    mensal,
    sistemas,
    top,
    metasSemanal,
    metasMensal,
    proximosEventos,
  ] = await Promise.all([
    svc.getKpisOverview(),
    svc.getAnalisesPorMes(12),
    svc.getDistribuicaoPorSistema(),
    svc.getProdutividadeServidores(6),
    metasService.listComProgresso({
      periodo: "semanal",
      ano: per.semanal.ano,
      semanaIso: per.semanal.semanaIso,
    }),
    metasService.listComProgresso({
      periodo: "mensal",
      ano: per.mensal.ano,
      mes: per.mensal.mes,
    }),
    eventosService.listProximosEventos({ limit: 5 }),
  ]);

  const metasAtivas = [...metasSemanal, ...metasMensal];

  return (
    <DashboardOverview
      kpis={kpis}
      mensal={mensal}
      sistemas={sistemas}
      topServidores={top}
      metasAtivas={metasAtivas}
      proximosEventos={proximosEventos.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        tipo: e.tipo,
        local: e.local,
        inicioIso: e.inicio.toISOString(),
        diaInteiro: e.diaInteiro,
      }))}
    />
  );
}
