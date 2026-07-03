import { count, eq, isNull } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { nucleos, servidorNucleo } from "@/lib/db/schema";

import { NucleosView } from "./nucleos-view";

export const dynamic = "force-dynamic";

export default async function NucleosPage() {
  // Núcleos + contagem de membros ativos (vínculo principal, sem data_fim)
  const rows = await db
    .select({
      id: nucleos.id,
      nome: nucleos.nome,
      descricao: nucleos.descricao,
      corTema: nucleos.corTema,
      minMembros: nucleos.minMembros,
      ativo: nucleos.ativo,
      membrosAtivos: count(servidorNucleo.id),
    })
    .from(nucleos)
    .leftJoin(
      servidorNucleo,
      eq(servidorNucleo.nucleoId, nucleos.id),
    )
    .where(isNull(servidorNucleo.dataFim))
    .groupBy(nucleos.id)
    .orderBy(nucleos.nome);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <NucleosView
            nucleos={rows.map((r) => ({
              id: r.id,
              nome: r.nome,
              descricao: r.descricao,
              corTema: r.corTema,
              minMembros: r.minMembros,
              ativo: r.ativo,
              membrosAtivos: Number(r.membrosAtivos),
            }))}
          />
        </main>
      </div>
    </div>
  );
}
