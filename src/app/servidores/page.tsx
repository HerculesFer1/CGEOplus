import { getServidoresService } from "@/lib/services/servidores.factory";
import { ServidoresView } from "./servidores-view";

export const dynamic = "force-dynamic";

export default async function ServidoresPage() {
  const svc = getServidoresService();
  const servidores = await svc.list();
  return <ServidoresView initialData={servidores} />;
}
