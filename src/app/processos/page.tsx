import { getProcessosService } from "@/lib/services/processos.factory";
import { getServidoresService } from "@/lib/services/servidores.factory";
import { ProcessosView } from "./processos-view";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    sistema?: string;
    busca?: string;
    page?: string;
  }>;
}

export default async function ProcessosPage({ searchParams }: Props) {
  const sp = await searchParams;

  const svc = getProcessosService();
  const servidoresSvc = getServidoresService();

  const [paged, servidores] = await Promise.all([
    svc.list({
      sistema: (["SEI", "SIGA", "SICAR"] as const).find((s) => s === sp.sistema),
      busca: sp.busca,
      page: sp.page ? Number(sp.page) : 1,
      pageSize: 50,
    }),
    servidoresSvc.list(),
  ]);

  return (
    <ProcessosView
      initialData={paged}
      servidores={servidores.map((s) => ({
        id: s.id,
        apelido: s.apelido,
        nome: s.nome,
      }))}
      currentFilters={{
        sistema: sp.sistema,
        busca: sp.busca,
      }}
    />
  );
}
