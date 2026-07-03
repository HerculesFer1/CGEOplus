import { asc } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { atividades, nucleos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { AtividadesView } from "./atividades-view";

export const dynamic = "force-dynamic";

export default async function AtividadesPage() {
  const rows = await db
    .select({
      id: atividades.id,
      nome: atividades.nome,
      complexidade: atividades.complexidade,
      descricao: atividades.descricao,
      ativo: atividades.ativo,
      nucleoNome: nucleos.nome,
    })
    .from(atividades)
    .leftJoin(nucleos, eq(nucleos.id, atividades.nucleoId))
    .orderBy(asc(atividades.complexidade), asc(atividades.nome));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <AtividadesView atividades={rows} />
        </main>
      </div>
    </div>
  );
}
