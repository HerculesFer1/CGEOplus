/**
 * Processos — Service Layer
 *
 * Responsabilidades:
 * - Regra de deduplicação: um processo é único por (numero, sistema)
 * - Cada linha da planilha vira uma análise; o processo é criado ou reusado
 * - Autoincremento de numeroOrdem por processo
 * - Validação SICAR ↔ finalidade
 */

import { randomUUID } from "node:crypto";

import {
  analiseFromPlanilhaSchema,
  processoCreateSchema,
  type AnaliseFromPlanilhaInput,
  type ProcessoCreateInput,
} from "@/lib/validators/processo";

export interface Processo {
  id: string;
  numero: string;
  sistema: "SEI" | "SIGA" | "SICAR" | "SINAFLOR";
  sicarFinalidade: "Lancamento" | "Analise" | "Mapeamento" | null;
  requerente: string | null;
  municipio: string | null;
  dataEntrada: string;
  statusAtual: "em_analise" | "concluido" | "arquivado";
  observacoes: string | null;
  totalAnalises: number;
  ultimaAnalise: string | null;
  createdAt: string;
}

export interface Analise {
  id: string;
  processoId: string;
  servidorId: string;
  servidorApelido: string;
  atividadeId: string | null;
  atividadeNome: string | null;
  dataAnalise: string;
  resultado:
    | "Finalizado"
    | "Analisado com pendencia"
    | "Indeferido"
    | "Desarquivado";
  setorDestino:
    | "Concluido no setor"
    | "CGEO"
    | "FLORESTA"
    | "Licenciamento"
    | "SICAR"
    | null;
  tempoGastoMin: number | null;
  observacoes: string | null;
  numeroOrdem: number;
  createdAt: string;
}

export interface ProcessoListFilters {
  sistema?: "SEI" | "SIGA" | "SICAR";
  sicarFinalidade?: "Lancamento" | "Analise" | "Mapeamento";
  busca?: string;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProcessoRepository {
  list(filters: ProcessoListFilters): Promise<Paged<Processo>>;
  findById(id: string): Promise<Processo | null>;
  findByNumeroSistema(
    numero: string,
    sistema: Processo["sistema"],
  ): Promise<Processo | null>;
  insert(
    data: Omit<Processo, "totalAnalises" | "ultimaAnalise" | "createdAt">,
  ): Promise<Processo>;
  update(id: string, patch: Partial<Processo>): Promise<Processo>;
  delete(id: string): Promise<void>;
}

export interface AnaliseRepository {
  listByProcesso(processoId: string): Promise<Analise[]>;
  nextOrdem(processoId: string): Promise<number>;
  insert(data: Omit<Analise, "createdAt" | "servidorApelido" | "atividadeNome">): Promise<Analise>;
  delete(id: string): Promise<void>;
}

export class ProcessoNotFoundError extends Error {
  constructor(id: string) {
    super(`Processo não encontrado: ${id}`);
    this.name = "ProcessoNotFoundError";
  }
}

export class ProcessosService {
  constructor(
    private readonly processos: ProcessoRepository,
    private readonly analises: AnaliseRepository,
  ) {}

  async list(filters: ProcessoListFilters = {}) {
    return this.processos.list({
      page: 1,
      pageSize: 50,
      ...filters,
    });
  }

  async get(id: string): Promise<Processo> {
    const p = await this.processos.findById(id);
    if (!p) throw new ProcessoNotFoundError(id);
    return p;
  }

  async listAnalises(processoId: string): Promise<Analise[]> {
    await this.get(processoId);
    return this.analises.listByProcesso(processoId);
  }

  async createProcesso(input: ProcessoCreateInput): Promise<Processo> {
    const parsed = processoCreateSchema.parse(input);
    const existing = await this.processos.findByNumeroSistema(
      parsed.numero.trim(),
      parsed.sistema,
    );
    if (existing) return existing;

    return this.processos.insert({
      id: randomUUID(),
      numero: parsed.numero.trim(),
      sistema: parsed.sistema,
      sicarFinalidade: parsed.sicarFinalidade ?? null,
      requerente: parsed.requerente || null,
      municipio: parsed.municipio || null,
      dataEntrada: parsed.dataEntrada,
      statusAtual: "em_analise",
      observacoes: parsed.observacoes || null,
    });
  }

  /**
   * Fluxo da planilha:
   * Dada uma linha (número, sistema, analista, data, resultado, setor),
   * cria o processo se não existir, depois cria a análise com numeroOrdem
   * incrementado automaticamente.
   */
  async registrarAnalisePlanilha(
    input: AnaliseFromPlanilhaInput,
  ): Promise<{ processo: Processo; analise: Analise }> {
    const parsed = analiseFromPlanilhaSchema.parse(input);

    let processo = await this.processos.findByNumeroSistema(
      parsed.numeroProcesso.trim(),
      parsed.sistema,
    );

    if (!processo) {
      processo = await this.processos.insert({
        id: randomUUID(),
        numero: parsed.numeroProcesso.trim(),
        sistema: parsed.sistema,
        sicarFinalidade: parsed.sicarFinalidade ?? null,
        requerente: null,
        municipio: null,
        dataEntrada: parsed.dataAnalise,
        statusAtual:
          parsed.resultado === "Finalizado" ? "concluido" : "em_analise",
        observacoes: null,
      });
    }

    const numeroOrdem = await this.analises.nextOrdem(processo.id);
    const analise = await this.analises.insert({
      id: randomUUID(),
      processoId: processo.id,
      servidorId: parsed.servidorId,
      atividadeId: null,
      dataAnalise: parsed.dataAnalise,
      resultado: parsed.resultado,
      setorDestino: parsed.setorDestino ?? null,
      tempoGastoMin: null,
      observacoes: parsed.observacoes || null,
      numeroOrdem,
    });

    return { processo, analise };
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    return this.processos.delete(id);
  }
}
