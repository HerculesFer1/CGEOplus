/**
 * Repositórios Drizzle para Processos e Análises.
 * Joins com servidores e atividades para trazer dados agregados.
 */

import { and, count, desc, eq, ilike, max, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analises as tblAnalises,
  atividades as tblAtividades,
  processos as tblProcessos,
  servidores as tblServidores,
} from "@/lib/db/schema";
import type {
  Analise,
  AnaliseRepository,
  Paged,
  Processo,
  ProcessoListFilters,
  ProcessoRepository,
} from "@/lib/services/processos.service";

function rowToProcesso(row: {
  id: string;
  numero: string;
  sistema: Processo["sistema"];
  sicarFinalidade: Processo["sicarFinalidade"];
  requerente: string | null;
  municipio: string | null;
  dataEntrada: string;
  statusAtual: Processo["statusAtual"];
  observacoes: string | null;
  totalAnalises: number;
  ultimaAnalise: string | null;
  createdAt: Date;
}): Processo {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

export class DrizzleProcessoRepository implements ProcessoRepository {
  async list(filters: ProcessoListFilters): Promise<Paged<Processo>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));

    const conditions = [];
    if (filters.sistema) conditions.push(eq(tblProcessos.sistema, filters.sistema));
    if (filters.sicarFinalidade)
      conditions.push(eq(tblProcessos.sicarFinalidade, filters.sicarFinalidade));
    if (filters.busca) {
      const q = `%${filters.busca}%`;
      conditions.push(
        or(
          ilike(tblProcessos.numero, q),
          ilike(tblProcessos.requerente, q),
          ilike(tblProcessos.municipio, q),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ n: count() })
      .from(tblProcessos)
      .where(whereClause);

    const rows = await db
      .select({
        id: tblProcessos.id,
        numero: tblProcessos.numero,
        sistema: tblProcessos.sistema,
        sicarFinalidade: tblProcessos.sicarFinalidade,
        requerente: tblProcessos.requerente,
        municipio: tblProcessos.municipio,
        dataEntrada: tblProcessos.dataEntrada,
        statusAtual: tblProcessos.statusAtual,
        observacoes: tblProcessos.observacoes,
        createdAt: tblProcessos.createdAt,
        totalAnalises: count(tblAnalises.id),
        ultimaAnalise: max(tblAnalises.dataAnalise),
      })
      .from(tblProcessos)
      .leftJoin(tblAnalises, eq(tblAnalises.processoId, tblProcessos.id))
      .where(whereClause)
      .groupBy(tblProcessos.id)
      .orderBy(desc(tblProcessos.dataEntrada))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      rows: rows.map(rowToProcesso),
      total: Number(totalRow?.n ?? 0),
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Processo | null> {
    const rows = await db
      .select({
        id: tblProcessos.id,
        numero: tblProcessos.numero,
        sistema: tblProcessos.sistema,
        sicarFinalidade: tblProcessos.sicarFinalidade,
        requerente: tblProcessos.requerente,
        municipio: tblProcessos.municipio,
        dataEntrada: tblProcessos.dataEntrada,
        statusAtual: tblProcessos.statusAtual,
        observacoes: tblProcessos.observacoes,
        createdAt: tblProcessos.createdAt,
        totalAnalises: count(tblAnalises.id),
        ultimaAnalise: max(tblAnalises.dataAnalise),
      })
      .from(tblProcessos)
      .leftJoin(tblAnalises, eq(tblAnalises.processoId, tblProcessos.id))
      .where(eq(tblProcessos.id, id))
      .groupBy(tblProcessos.id)
      .limit(1);

    return rows.length > 0 ? rowToProcesso(rows[0]) : null;
  }

  async findByNumeroSistema(
    numero: string,
    sistema: Processo["sistema"],
  ): Promise<Processo | null> {
    const rows = await db
      .select({
        id: tblProcessos.id,
        numero: tblProcessos.numero,
        sistema: tblProcessos.sistema,
        sicarFinalidade: tblProcessos.sicarFinalidade,
        requerente: tblProcessos.requerente,
        municipio: tblProcessos.municipio,
        dataEntrada: tblProcessos.dataEntrada,
        statusAtual: tblProcessos.statusAtual,
        observacoes: tblProcessos.observacoes,
        createdAt: tblProcessos.createdAt,
        totalAnalises: count(tblAnalises.id),
        ultimaAnalise: max(tblAnalises.dataAnalise),
      })
      .from(tblProcessos)
      .leftJoin(tblAnalises, eq(tblAnalises.processoId, tblProcessos.id))
      .where(
        and(eq(tblProcessos.numero, numero), eq(tblProcessos.sistema, sistema)),
      )
      .groupBy(tblProcessos.id)
      .limit(1);

    return rows.length > 0 ? rowToProcesso(rows[0]) : null;
  }

  async insert(
    data: Omit<Processo, "totalAnalises" | "ultimaAnalise" | "createdAt">,
  ): Promise<Processo> {
    const [inserted] = await db
      .insert(tblProcessos)
      .values({
        id: data.id,
        numero: data.numero,
        sistema: data.sistema,
        sicarFinalidade: data.sicarFinalidade ?? null,
        requerente: data.requerente,
        municipio: data.municipio,
        dataEntrada: data.dataEntrada,
        statusAtual: data.statusAtual,
        observacoes: data.observacoes,
      })
      .returning();

    return {
      id: inserted.id,
      numero: inserted.numero,
      sistema: inserted.sistema,
      sicarFinalidade: inserted.sicarFinalidade,
      requerente: inserted.requerente,
      municipio: inserted.municipio,
      dataEntrada: inserted.dataEntrada,
      statusAtual: inserted.statusAtual,
      observacoes: inserted.observacoes,
      totalAnalises: 0,
      ultimaAnalise: null,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async update(id: string, patch: Partial<Processo>): Promise<Processo> {
    const set: Record<string, unknown> = {};
    if (patch.numero !== undefined) set.numero = patch.numero;
    if (patch.sistema !== undefined) set.sistema = patch.sistema;
    if (patch.sicarFinalidade !== undefined)
      set.sicarFinalidade = patch.sicarFinalidade;
    if (patch.requerente !== undefined) set.requerente = patch.requerente;
    if (patch.municipio !== undefined) set.municipio = patch.municipio;
    if (patch.dataEntrada !== undefined) set.dataEntrada = patch.dataEntrada;
    if (patch.statusAtual !== undefined) set.statusAtual = patch.statusAtual;
    if (patch.observacoes !== undefined) set.observacoes = patch.observacoes;

    await db.update(tblProcessos).set(set).where(eq(tblProcessos.id, id));
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Processo ${id} não encontrado após update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.delete(tblProcessos).where(eq(tblProcessos.id, id));
    // analises cascatiza via FK
  }
}

export class DrizzleAnaliseRepository implements AnaliseRepository {
  async listByProcesso(processoId: string): Promise<Analise[]> {
    const rows = await db
      .select({
        id: tblAnalises.id,
        processoId: tblAnalises.processoId,
        servidorId: tblAnalises.servidorId,
        servidorApelido: tblServidores.apelido,
        atividadeId: tblAnalises.atividadeId,
        atividadeNome: tblAtividades.nome,
        dataAnalise: tblAnalises.dataAnalise,
        resultado: tblAnalises.resultado,
        setorDestino: tblAnalises.setorDestino,
        tempoGastoMin: tblAnalises.tempoGastoMin,
        observacoes: tblAnalises.observacoes,
        numeroOrdem: tblAnalises.numeroOrdem,
        createdAt: tblAnalises.createdAt,
      })
      .from(tblAnalises)
      .innerJoin(tblServidores, eq(tblServidores.id, tblAnalises.servidorId))
      .leftJoin(tblAtividades, eq(tblAtividades.id, tblAnalises.atividadeId))
      .where(eq(tblAnalises.processoId, processoId))
      .orderBy(desc(tblAnalises.dataAnalise), desc(tblAnalises.numeroOrdem));

    return rows.map((r) => ({
      id: r.id,
      processoId: r.processoId,
      servidorId: r.servidorId,
      servidorApelido: r.servidorApelido ?? "?",
      atividadeId: r.atividadeId,
      atividadeNome: r.atividadeNome,
      dataAnalise: r.dataAnalise,
      resultado: r.resultado,
      setorDestino: r.setorDestino,
      tempoGastoMin: r.tempoGastoMin,
      observacoes: r.observacoes,
      numeroOrdem: r.numeroOrdem ?? 1,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async nextOrdem(processoId: string): Promise<number> {
    const [row] = await db
      .select({ max: max(tblAnalises.numeroOrdem) })
      .from(tblAnalises)
      .where(eq(tblAnalises.processoId, processoId));
    return (Number(row?.max) || 0) + 1;
  }

  async insert(
    data: Omit<Analise, "createdAt" | "servidorApelido" | "atividadeNome">,
  ): Promise<Analise> {
    const [inserted] = await db
      .insert(tblAnalises)
      .values({
        id: data.id,
        processoId: data.processoId,
        servidorId: data.servidorId,
        atividadeId: data.atividadeId,
        dataAnalise: data.dataAnalise,
        resultado: data.resultado,
        setorDestino: data.setorDestino,
        tempoGastoMin: data.tempoGastoMin,
        observacoes: data.observacoes,
        numeroOrdem: data.numeroOrdem,
      })
      .returning();

    // Busca com joins para preencher apelido / atividade
    const list = await this.listByProcesso(data.processoId);
    const found = list.find((a) => a.id === inserted.id);
    if (!found) throw new Error("Análise recém-inserida não encontrada");
    return found;
  }

  async delete(id: string): Promise<void> {
    await db.delete(tblAnalises).where(eq(tblAnalises.id, id));
    void sql; // keep import used
  }
}
