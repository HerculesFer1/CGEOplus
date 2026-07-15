import Link from "next/link";
import { FolderX, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  // Guard: se o link do sidebar (?programa=PSI) aponta para um programa que
  // não existe no banco (típico após limpeza de dados), evita renderizar a
  // view completa com estruturas vazias e mostra CTA para importar/cadastrar.
  const programaInfo = programas.find((p) => p.sigla === sigla);
  if (!programaInfo) {
    return <ProgramaNaoEncontrado sigla={sigla} />;
  }

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

function ProgramaNaoEncontrado({ sigla }: { sigla: string }) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border bg-[var(--elevated)] p-8 text-center shadow-[var(--shadow-sm)]">
        <FolderX className="mx-auto h-10 w-10 text-[var(--text-muted)]" strokeWidth={1.5} />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Projeto &ldquo;{sigla}&rdquo; ainda não cadastrado
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Nenhum programa com essa sigla foi encontrado. Importe uma planilha
          de monitoramento para começar ou volte para a visão geral dos projetos.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/monitoramento">Visão geral</Link>
          </Button>
          <Button asChild>
            <Link href="/monitoramento/importar">
              <Upload className="mr-2 h-4 w-4" />
              Importar planilha
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
