import { getDashboardService } from "@/lib/services/dashboard.service";

import { SobrecargaView } from "./sobrecarga-view";

export const dynamic = "force-dynamic";

export default async function SobrecargaPage() {
  const svc = getDashboardService();
  const nucleos = await svc.getCargaNucleos();
  return <SobrecargaView nucleos={nucleos} />;
}
