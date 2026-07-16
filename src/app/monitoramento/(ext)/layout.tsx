import { getUltimasExecucoes } from "@/lib/monit-ext/queries";
import { TimelineBases } from "@/components/monit-ext/timeline-bases";

export const dynamic = "force-dynamic";

/**
 * Layout compartilhado das 3 rotas externas (mapbiomas / prodes / queimadas).
 * Herda `Sidebar` + `Topbar` do layout pai (`/monitoramento/layout.tsx`) e
 * adiciona a Timeline de Bases federais no topo — contexto sempre visível
 * de "quando o dado foi atualizado e quando entra a próxima janela".
 */
export default async function MonitExtLayout({ children }: { children: React.ReactNode }) {
  const execucoes = await getUltimasExecucoes();

  return (
    <div>
      <TimelineBases execucoes={execucoes} />
      {children}
    </div>
  );
}
