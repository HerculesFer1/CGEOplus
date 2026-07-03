/**
 * Executor do import: recebe linhas parseadas + mapa de servidor apelido→id
 * e chama a service em batch, retornando estatísticas.
 */

import type { LinhaPlanilha } from "./planilha-parser";
import { getProcessosService } from "@/lib/services/processos.factory";
import { getServidoresService } from "@/lib/services/servidores.factory";

export interface ImportStats {
  totalLinhas: number;
  processosCriados: number;
  analisesInseridas: number;
  ignorados: number;
  erros: { linha: LinhaPlanilha; problema: string }[];
}

/**
 * Constrói mapa apelido (normalizado) → servidorId a partir do que existe no banco.
 */
export async function buildAnalistaMap(): Promise<Map<string, string>> {
  const svc = getServidoresService();
  const servidores = await svc.list();
  const map = new Map<string, string>();
  for (const s of servidores) {
    const key = s.apelido.trim().toLowerCase();
    if (key) map.set(key, s.id);
    // Também aceita match pelo primeiro nome — útil quando apelido tem acento
    const primeiroNome = s.nome.split(" ")[0].toLowerCase();
    if (primeiroNome && !map.has(primeiroNome)) map.set(primeiroNome, s.id);
  }
  return map;
}

export async function executarImport(
  linhas: LinhaPlanilha[],
  analistaMap: Map<string, string>,
  onProgress?: (feitas: number, total: number) => void,
): Promise<ImportStats> {
  const svc = getProcessosService();
  const stats: ImportStats = {
    totalLinhas: linhas.length,
    processosCriados: 0,
    analisesInseridas: 0,
    ignorados: 0,
    erros: [],
  };

  const processosVistos = new Set<string>();

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const servidorId = analistaMap.get(l.analistaApelido.trim().toLowerCase());
    if (!servidorId) {
      stats.erros.push({ linha: l, problema: `Analista "${l.analistaApelido}" não cadastrado` });
      stats.ignorados++;
      continue;
    }

    try {
      const result = await svc.registrarAnalisePlanilha({
        numeroProcesso: l.numeroProcesso,
        sistema: l.sistema,
        sicarFinalidade: l.sicarFinalidade,
        servidorId,
        dataAnalise: l.dataAnalise,
        resultado: l.resultado,
        setorDestino: l.setorDestino,
        observacoes: l.observacoes ?? "",
      });

      const key = `${result.processo.numero}::${result.processo.sistema}`;
      if (!processosVistos.has(key)) {
        processosVistos.add(key);
        if (result.analise.numeroOrdem === 1) stats.processosCriados++;
      }
      stats.analisesInseridas++;
    } catch (err) {
      stats.erros.push({
        linha: l,
        problema: err instanceof Error ? err.message : String(err),
      });
    }

    if (onProgress && i % 25 === 0) onProgress(i + 1, linhas.length);
  }

  if (onProgress) onProgress(linhas.length, linhas.length);

  return stats;
}
