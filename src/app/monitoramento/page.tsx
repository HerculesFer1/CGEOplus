import {
  listProgramas,
  listResumoComunidades,
  listResumoIntervalosByPrograma,
} from "@/lib/monitoramento/queries";

import { MonitoramentoView } from "./monitoramento-view";
import { MonitoramentoVisaoGeral } from "./monitoramento-visao-geral";

export const dynamic = "force-dynamic";

interface SP {
  programa?: string;
  intervalo?: string;
}

export default async function Page(props: {
  searchParams: Promise<SP>;
}) {
  const sp = await props.searchParams;
  const programas = await listProgramas();

  // Sem `?programa=` → visão geral comparativa dos dois programas.
  // Com `?programa=X` → dashboard específico daquele programa.
  if (!sp.programa) {
    const resumos = await Promise.all(
      programas.map(async (p) => ({
        programa: p,
        intervalos: await listResumoIntervalosByPrograma(p.sigla),
      })),
    );
    return <MonitoramentoVisaoGeral programas={programas} resumos={resumos} />;
  }

  const sigla = sp.programa;
  const intervalos = await listResumoIntervalosByPrograma(sigla);
  const comunidades = await listResumoComunidades(sigla, sp.intervalo);

  return (
    <MonitoramentoView
      programas={programas}
      programaSelecionada={sigla}
      intervaloSelecionado={sp.intervalo}
      intervalos={intervalos}
      comunidades={comunidades}
    />
  );
}
