/**
 * Serviço de agregações para dashboards.
 * Todas as queries são otimizadas e não fazem N+1.
 */

import { count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analises,
  processos,
  servidores,
  nucleos,
  servidorNucleo,
} from "@/lib/db/schema";

export interface KpiOverview {
  totalProcessos: number;
  totalAnalises: number;
  analisesMesAtual: number;
  analisesMesAnterior: number;
  deltaPercentual: number;
  taxaFinalizados: number;
  totalServidoresAtivos: number;
}

export interface AnaliseMensal {
  mes: string; // "2026-01"
  total: number;
  finalizados: number;
  pendencias: number;
  indeferidos: number;
}

export interface DistribuicaoSistema {
  sistema: string;
  total: number;
  percentual: number;
}

export interface ProdutividadeServidor {
  servidorId: string;
  apelido: string;
  nome: string;
  nucleoPrincipal: string | null;
  totalAnalises: number;
  finalizados: number;
  pendencias: number;
}

export interface CargaNucleo {
  nucleoNome: string;
  totalMembros: number;
  totalAnalises: number;
  mediaAnalisesPorMembro: number;
  minMembros: number;
  sobrecargaPercentual: number;
}

export class DashboardService {
  async getKpisOverview(): Promise<KpiOverview> {
    const [procRow] = await db
      .select({ n: count() })
      .from(processos);

    const [analRow] = await db.select({ n: count() }).from(analises);

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);

    const [curMes] = await db
      .select({ n: count() })
      .from(analises)
      .where(sql`to_char(${analises.dataAnalise}, 'YYYY-MM') = ${currentMonth}`);

    const [prevMes] = await db
      .select({ n: count() })
      .from(analises)
      .where(sql`to_char(${analises.dataAnalise}, 'YYYY-MM') = ${prevMonth}`);

    const cur = Number(curMes?.n ?? 0);
    const prev = Number(prevMes?.n ?? 0);
    const delta = prev > 0 ? ((cur - prev) / prev) * 100 : 0;

    const [finalizadas] = await db
      .select({ n: count() })
      .from(analises)
      .where(eq(analises.resultado, "Finalizado"));

    const [ativos] = await db
      .select({ n: count() })
      .from(servidores)
      .where(eq(servidores.status, "ativo"));

    const totalAn = Number(analRow?.n ?? 0);

    return {
      totalProcessos: Number(procRow?.n ?? 0),
      totalAnalises: totalAn,
      analisesMesAtual: cur,
      analisesMesAnterior: prev,
      deltaPercentual: delta,
      taxaFinalizados:
        totalAn > 0 ? (Number(finalizadas?.n ?? 0) / totalAn) * 100 : 0,
      totalServidoresAtivos: Number(ativos?.n ?? 0),
    };
  }

  async getAnalisesPorMes(ultimosMeses = 12): Promise<AnaliseMensal[]> {
    const rows = await db
      .select({
        mes: sql<string>`to_char(${analises.dataAnalise}, 'YYYY-MM')`,
        total: count(analises.id),
        finalizados: sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Finalizado' THEN 1 ELSE 0 END)::int`,
        pendencias: sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Analisado com pendencia' THEN 1 ELSE 0 END)::int`,
        indeferidos: sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Indeferido' THEN 1 ELSE 0 END)::int`,
      })
      .from(analises)
      .groupBy(sql`to_char(${analises.dataAnalise}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${analises.dataAnalise}, 'YYYY-MM')`);

    // Últimos N meses (rows já vem ordenado ascendente)
    return rows.slice(-ultimosMeses).map((r) => ({
      mes: r.mes,
      total: Number(r.total),
      finalizados: Number(r.finalizados),
      pendencias: Number(r.pendencias),
      indeferidos: Number(r.indeferidos),
    }));
  }

  async getDistribuicaoPorSistema(): Promise<DistribuicaoSistema[]> {
    const rows = await db
      .select({
        sistema: processos.sistema,
        total: count(),
      })
      .from(processos)
      .groupBy(processos.sistema)
      .orderBy(desc(count()));

    const totalGeral = rows.reduce((sum, r) => sum + Number(r.total), 0);
    return rows.map((r) => ({
      sistema: r.sistema,
      total: Number(r.total),
      percentual: totalGeral > 0 ? (Number(r.total) / totalGeral) * 100 : 0,
    }));
  }

  async getProdutividadeServidores(limit = 15): Promise<ProdutividadeServidor[]> {
    const rows = await db
      .select({
        servidorId: servidores.id,
        apelido: servidores.apelido,
        nome: servidores.nome,
        nucleoPrincipal: nucleos.nome,
        totalAnalises: count(analises.id),
        finalizados: sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Finalizado' THEN 1 ELSE 0 END)::int`,
        pendencias: sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Analisado com pendencia' THEN 1 ELSE 0 END)::int`,
      })
      .from(servidores)
      .leftJoin(analises, eq(analises.servidorId, servidores.id))
      .leftJoin(
        servidorNucleo,
        sql`${servidorNucleo.servidorId} = ${servidores.id} AND ${servidorNucleo.isPrincipal} = true AND ${servidorNucleo.dataFim} IS NULL`,
      )
      .leftJoin(nucleos, eq(nucleos.id, servidorNucleo.nucleoId))
      .groupBy(
        servidores.id,
        servidores.apelido,
        servidores.nome,
        nucleos.nome,
      )
      .orderBy(desc(count(analises.id)))
      .limit(limit);

    return rows.map((r) => ({
      servidorId: r.servidorId,
      apelido: r.apelido ?? "?",
      nome: r.nome,
      nucleoPrincipal: r.nucleoPrincipal,
      totalAnalises: Number(r.totalAnalises),
      finalizados: Number(r.finalizados),
      pendencias: Number(r.pendencias),
    }));
  }

  async getCargaNucleos(): Promise<CargaNucleo[]> {
    const rows = await db
      .select({
        nucleoNome: nucleos.nome,
        minMembros: nucleos.minMembros,
        totalMembros: sql<number>`COUNT(DISTINCT ${servidorNucleo.servidorId})::int`,
        totalAnalises: sql<number>`COUNT(${analises.id})::int`,
      })
      .from(nucleos)
      .leftJoin(
        servidorNucleo,
        sql`${servidorNucleo.nucleoId} = ${nucleos.id} AND ${servidorNucleo.isPrincipal} = true AND ${servidorNucleo.dataFim} IS NULL`,
      )
      .leftJoin(analises, eq(analises.servidorId, servidorNucleo.servidorId))
      .where(eq(nucleos.ativo, true))
      .groupBy(nucleos.id, nucleos.nome, nucleos.minMembros)
      .orderBy(desc(sql`COUNT(${analises.id})`));

    return rows.map((r) => {
      const totalM = Number(r.totalMembros);
      const totalA = Number(r.totalAnalises);
      const media = totalM > 0 ? totalA / totalM : 0;
      // sobrecarga = quão perto está do mínimo (invertido) + carga alta
      const distanciaMin = totalM - r.minMembros;
      const sobrecarga = Math.min(
        100,
        Math.max(0, (media / 1000) * 60 + (distanciaMin <= 0 ? 40 : 0)),
      );
      return {
        nucleoNome: r.nucleoNome,
        totalMembros: totalM,
        totalAnalises: totalA,
        mediaAnalisesPorMembro: media,
        minMembros: r.minMembros,
        sobrecargaPercentual: sobrecarga,
      };
    });
  }
}

let cached: DashboardService | null = null;
export function getDashboardService(): DashboardService {
  if (!cached) cached = new DashboardService();
  return cached;
}
