import { db } from "@/lib/db/client";
import { programas } from "@/lib/db/monitoramento";
import { eq } from "drizzle-orm";

import { ImportarMonitoramentoView } from "./importar-view";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await db
    .select({ sigla: programas.sigla, nome: programas.nome })
    .from(programas)
    .where(eq(programas.ativo, true))
    .orderBy(programas.sigla);

  return <ImportarMonitoramentoView programas={rows} />;
}
