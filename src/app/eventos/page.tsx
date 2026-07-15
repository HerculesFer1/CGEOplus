import { asc, eq } from "drizzle-orm";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { db } from "@/lib/db/client";
import { nucleos } from "@/lib/db/schema";
import { eventosService } from "@/lib/services/eventos.service";

import { EventosView } from "./eventos-view";

export const dynamic = "force-dynamic";

type SearchParams = {
  view?: string; // 'mes' | 'semana' | 'agenda'
  ano?: string;
  mes?: string; // 1..12
  dia?: string; // 1..31 (âncora da semana)
};

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const view =
    params.view === "semana" || params.view === "agenda" ? params.view : "mes";

  const now = new Date();
  const ano = params.ano ? Number(params.ano) : now.getFullYear();
  const mes = params.mes ? Number(params.mes) : now.getMonth() + 1;
  const dia = params.dia ? Number(params.dia) : now.getDate();

  // Janela suficientemente ampla para as 3 visualizações:
  //   mês: cobre o mês inteiro (com folga para semanas que atravessam)
  //   semana: 7 dias a partir de segunda
  //   agenda: 60 dias a partir de hoje
  const inicioJanela =
    view === "agenda"
      ? new Date(Date.UTC(ano, mes - 1, dia))
      : new Date(Date.UTC(ano, mes - 1, 1));
  inicioJanela.setUTCDate(inicioJanela.getUTCDate() - 7); // folga para semana anterior aparecer no grid

  const fimJanela =
    view === "agenda"
      ? new Date(Date.UTC(ano, mes - 1, dia + 60))
      : new Date(Date.UTC(ano, mes, 7)); // fim do mês + folga

  const [eventosRows, nucleosRows] = await Promise.all([
    eventosService.listNaJanela(inicioJanela, fimJanela),
    db
      .select({ id: nucleos.id, nome: nucleos.nome, corTema: nucleos.corTema })
      .from(nucleos)
      .where(eq(nucleos.ativo, true))
      .orderBy(asc(nucleos.nome)),
  ]);

  // Serializa datas para JSON — client recebe strings ISO
  const eventosSerializados = eventosRows.map((e) => ({
    ...e,
    inicio: e.inicio.toISOString(),
    fim: e.fim.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <EventosView
            eventos={eventosSerializados}
            nucleos={nucleosRows}
            view={view}
            ano={ano}
            mes={mes}
            dia={dia}
          />
        </main>
      </div>
    </div>
  );
}
