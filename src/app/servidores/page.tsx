import { asc, eq } from "drizzle-orm";

import { getServidoresService } from "@/lib/services/servidores.factory";
import { db } from "@/lib/db/client";
import { nucleos } from "@/lib/db/schema";
import { ServidoresView } from "./servidores-view";

export const dynamic = "force-dynamic";

export default async function ServidoresPage() {
  const svc = getServidoresService();
  const [servidores, nucleosRows] = await Promise.all([
    svc.list(),
    db
      .select({ nome: nucleos.nome })
      .from(nucleos)
      .where(eq(nucleos.ativo, true))
      .orderBy(asc(nucleos.nome)),
  ]);
  const nucleosDisponiveis = nucleosRows.map((n) => n.nome);
  return (
    <ServidoresView
      initialData={servidores}
      nucleosDisponiveis={nucleosDisponiveis}
    />
  );
}
