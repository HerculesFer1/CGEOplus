import { asc, eq } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { atividades, nucleos } from "@/lib/db/schema";

import { AtividadesView } from "./atividades-view";

export const dynamic = "force-dynamic";

export default async function AtividadesPage() {
  const [rows, nucleosRows] = await Promise.all([
    db
      .select({
        id: atividades.id,
        nome: atividades.nome,
        complexidade: atividades.complexidade,
        descricao: atividades.descricao,
        ativo: atividades.ativo,
        nucleoId: atividades.nucleoId,
        nucleoNome: nucleos.nome,
      })
      .from(atividades)
      .leftJoin(nucleos, eq(nucleos.id, atividades.nucleoId))
      .orderBy(asc(atividades.complexidade), asc(atividades.nome)),
    db
      .select({ id: nucleos.id, nome: nucleos.nome })
      .from(nucleos)
      .where(eq(nucleos.ativo, true))
      .orderBy(asc(nucleos.nome)),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <AtividadesView atividades={rows} nucleos={nucleosRows} />
        </main>
      </div>
    </div>
  );
}
