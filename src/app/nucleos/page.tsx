import { asc, and, count, eq, isNull } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { nucleos, servidorNucleo, servidores } from "@/lib/db/schema";

import { NucleosView, type ApoiadorRow } from "./nucleos-view";

export const dynamic = "force-dynamic";

export default async function NucleosPage() {
  const [nucleoRows, servidorRows, apoioRows] = await Promise.all([
    db
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
        and(
          eq(servidorNucleo.nucleoId, nucleos.id),
          eq(servidorNucleo.isPrincipal, true),
          isNull(servidorNucleo.dataFim),
        ),
      )
      .groupBy(nucleos.id)
      .orderBy(nucleos.nome),

    // Todos os servidores ativos + núcleo principal atual (se houver)
    db
      .select({
        id: servidores.id,
        nome: servidores.nome,
        apelido: servidores.apelido,
        nucleoAtualId: servidorNucleo.nucleoId,
        nucleoAtual: nucleos.nome,
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
      .leftJoin(nucleos, eq(nucleos.id, servidorNucleo.nucleoId))
      .where(eq(servidores.status, "ativo"))
      .orderBy(asc(servidores.nome)),

    // Todos os vínculos de APOIO ativos (isPrincipal=false, data_fim=null).
    // Um servidor pode aparecer em N núcleos como apoiador.
    db
      .select({
        vinculoId: servidorNucleo.id,
        nucleoId: servidorNucleo.nucleoId,
        servidorId: servidores.id,
        nome: servidores.nome,
        apelido: servidores.apelido,
        dataInicio: servidorNucleo.dataInicio,
        motivo: servidorNucleo.motivo,
      })
      .from(servidorNucleo)
      .innerJoin(servidores, eq(servidores.id, servidorNucleo.servidorId))
      .where(
        and(
          eq(servidorNucleo.isPrincipal, false),
          isNull(servidorNucleo.dataFim),
          eq(servidores.status, "ativo"),
        ),
      )
      .orderBy(asc(servidores.nome)),
  ]);

  // Agrupa apoiadores por núcleo para não fazer N chamadas no client.
  const apoiadoresByNucleo = new Map<string, ApoiadorRow[]>();
  for (const a of apoioRows) {
    const list = apoiadoresByNucleo.get(a.nucleoId) ?? [];
    list.push({
      vinculoId: a.vinculoId,
      servidorId: a.servidorId,
      nome: a.nome,
      apelido: a.apelido ?? "",
      dataInicio: a.dataInicio,
      motivo: a.motivo,
    });
    apoiadoresByNucleo.set(a.nucleoId, list);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <NucleosView
            nucleos={nucleoRows.map((r) => ({
              id: r.id,
              nome: r.nome,
              descricao: r.descricao,
              corTema: r.corTema,
              minMembros: r.minMembros,
              ativo: r.ativo,
              membrosAtivos: Number(r.membrosAtivos),
              apoiadores: apoiadoresByNucleo.get(r.id) ?? [],
            }))}
            servidores={servidorRows.map((s) => ({
              id: s.id,
              nome: s.nome,
              apelido: s.apelido ?? "",
              nucleoAtualId: s.nucleoAtualId,
              nucleoAtual: s.nucleoAtual,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
