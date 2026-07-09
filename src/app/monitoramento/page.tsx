import {
  listProgramas,
  listResumoComunidades,
  listResumoIntervalosByPrograma,
} from "@/lib/monitoramento/queries";

import { MonitoramentoView } from "./monitoramento-view";

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
  const sigla = sp.programa ?? programas[0]?.sigla ?? "PSI";

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
