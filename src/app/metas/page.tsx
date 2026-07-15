import { asc, eq } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { atividades, nucleos, servidores } from "@/lib/db/schema";
import { metasService, periodoAtual } from "@/lib/services/metas.service";
import type { MetaPeriodo } from "@/lib/validators/meta";

import { MetasView } from "./metas-view";

export const dynamic = "force-dynamic";

type SearchParams = {
  periodo?: string;
  ano?: string;
  mes?: string;
  semana?: string;
};

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const atual = periodoAtual();

  const periodo: MetaPeriodo =
    params.periodo === "semanal" ? "semanal" : "mensal";

  const filtro =
    periodo === "mensal"
      ? {
          periodo,
          ano: params.ano ? Number(params.ano) : atual.mensal.ano,
          mes: params.mes ? Number(params.mes) : atual.mensal.mes,
        }
      : {
          periodo,
          ano: params.ano ? Number(params.ano) : atual.semanal.ano,
          semanaIso: params.semana ? Number(params.semana) : atual.semanal.semanaIso,
        };

  const [metasComProgresso, nucleosRows, servidoresRows, atividadesRows] =
    await Promise.all([
      metasService.listComProgresso(filtro),
      db
        .select({ id: nucleos.id, nome: nucleos.nome, corTema: nucleos.corTema })
        .from(nucleos)
        .where(eq(nucleos.ativo, true))
        .orderBy(asc(nucleos.nome)),
      db
        .select({
          id: servidores.id,
          nome: servidores.nome,
          apelido: servidores.apelido,
        })
        .from(servidores)
        .where(eq(servidores.status, "ativo"))
        .orderBy(asc(servidores.apelido)),
      db
        .select({ id: atividades.id, nome: atividades.nome })
        .from(atividades)
        .where(eq(atividades.ativo, true))
        .orderBy(asc(atividades.nome)),
    ]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <MetasView
            metas={metasComProgresso}
            filtro={filtro}
            nucleos={nucleosRows}
            servidores={servidoresRows}
            atividades={atividadesRows}
          />
        </main>
      </div>
    </div>
  );
}
