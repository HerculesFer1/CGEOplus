import { asc, and, eq, isNull } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { nucleos, servidorNucleo, servidores } from "@/lib/db/schema";

import { RemanejamentoView } from "./remanejamento-view";

export const dynamic = "force-dynamic";

export default async function RemanejamentoPage() {
  const [nucleoRows, servidorRows] = await Promise.all([
    db
      .select({
        id: nucleos.id,
        nome: nucleos.nome,
        corTema: nucleos.corTema,
      })
      .from(nucleos)
      .where(eq(nucleos.ativo, true))
      .orderBy(asc(nucleos.nome)),

    db
      .select({
        id: servidores.id,
        nome: servidores.nome,
        apelido: servidores.apelido,
        cargo: servidores.cargo,
        nucleoAtualId: servidorNucleo.nucleoId,
      })
      .from(servidores)
      .leftJoin(
        servidorNucleo,
        and(
          eq(servidorNucleo.servidorId, servidores.id),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      )
      .where(eq(servidores.status, "ativo"))
      .orderBy(asc(servidores.nome)),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <RemanejamentoView
            nucleos={nucleoRows}
            servidoresIniciais={servidorRows.map((s) => ({
              id: s.id,
              nome: s.nome,
              apelido: s.apelido ?? "",
              cargo: s.cargo,
              nucleoAtualId: s.nucleoAtualId,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
