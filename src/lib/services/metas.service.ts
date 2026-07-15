/**
 * Metas — carregamento e cálculo de progresso em tempo real.
 *
 * Regras-chave:
 *  - Progresso é sempre calculado agora, contra a tabela `analises`.
 *  - Semana ISO 8601: começa na segunda, termina no domingo; semana 1 do ano
 *    é a que contém a primeira quinta-feira. Uso `EXTRACT(week ...)` /
 *    `EXTRACT(isoyear ...)` do Postgres para consistência com a UI.
 *  - Farol de ritmo compara % do tempo decorrido no período vs % da meta:
 *      diff = pctAtingido - pctTempo
 *      verde  se diff >= 0
 *      amarelo se diff BETWEEN -0.15 e 0
 *      vermelho se diff < -0.15
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analises,
  atividades,
  metas,
  nucleos,
  processos,
  servidorNucleo,
  servidores,
} from "@/lib/db/schema";
import type {
  MetaEscopo,
  MetaMetrica,
  MetaPeriodo,
  MetaSistema,
} from "@/lib/validators/meta";

export interface MetaRow {
  id: string;
  periodo: MetaPeriodo;
  escopo: MetaEscopo;
  alvoId: string | null;
  alvoSistema: MetaSistema | null;
  alvoNome: string | null; // "Marco", "Núcleo SIGA", "SICAR", "CGEO"
  alvoCorTema: string | null;
  metrica: MetaMetrica;
  valorAlvo: number;
  ano: number;
  mes: number | null;
  semanaIso: number | null;
  observacao: string | null;
}

export interface MetaComProgresso extends MetaRow {
  realizado: number;
  percentualAtingido: number; // 0..100+
  percentualTempo: number; // 0..100 — quanto do período já passou
  farol: "verde" | "amarelo" | "vermelho";
  diasRestantes: number;
  periodoLabel: string; // "Jul/2026" ou "Semana 28 · 06–12 jul"
}

/* --------------------------------------------------------------------------
   Helpers de período
   -------------------------------------------------------------------------- */

const MONTH_ABBR = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Primeiro e último dia (UTC) de um mês. */
function boundsMensal(ano: number, mes: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(ano, mes - 1, 1));
  const end = new Date(Date.UTC(ano, mes, 0)); // dia 0 do próximo = último do atual
  return { start, end };
}

/** Segunda e domingo (UTC) da semana ISO. */
function boundsSemanal(
  isoYear: number,
  isoWeek: number,
): { start: Date; end: Date } {
  // Algoritmo ISO 8601: jan 4 sempre está na semana 1.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7; // domingo=7
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1));
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

function periodoLabel(m: {
  periodo: MetaPeriodo;
  ano: number;
  mes: number | null;
  semanaIso: number | null;
}): string {
  if (m.periodo === "mensal" && m.mes) {
    return `${MONTH_ABBR[m.mes - 1]}/${m.ano}`;
  }
  if (m.periodo === "semanal" && m.semanaIso) {
    const { start, end } = boundsSemanal(m.ano, m.semanaIso);
    const d1 = start.getUTCDate().toString().padStart(2, "0");
    const d2 = end.getUTCDate().toString().padStart(2, "0");
    const mes = MONTH_ABBR[end.getUTCMonth()].toLowerCase();
    return `Semana ${m.semanaIso} · ${d1}–${d2} ${mes}`;
  }
  return "";
}

function computeFarol(
  pctAtingido: number,
  pctTempo: number,
): "verde" | "amarelo" | "vermelho" {
  const diff = pctAtingido - pctTempo;
  if (diff >= 0) return "verde";
  if (diff >= -15) return "amarelo";
  return "vermelho";
}

/* --------------------------------------------------------------------------
   Núcleo do serviço
   -------------------------------------------------------------------------- */

export class MetasService {
  /**
   * Lista metas do período (ano+mes ou ano+semana) com nome do alvo resolvido
   * via LEFT JOINs — evita N+1 no consumo depois.
   */
  async listMetasDoPeriodo(filtro: {
    periodo: MetaPeriodo;
    ano: number;
    mes?: number;
    semanaIso?: number;
  }): Promise<MetaRow[]> {
    const conds = [
      eq(metas.periodo, filtro.periodo),
      eq(metas.ano, filtro.ano),
    ];
    if (filtro.periodo === "mensal" && filtro.mes) {
      conds.push(eq(metas.mes, filtro.mes));
    }
    if (filtro.periodo === "semanal" && filtro.semanaIso) {
      conds.push(eq(metas.semanaIso, filtro.semanaIso));
    }

    // Uso subquery correlacionado no SELECT em vez de N JOINs discriminados —
    // Drizzle não facilita join polimórfico; assim fica só uma query.
    const rows = await db
      .select({
        id: metas.id,
        periodo: metas.periodo,
        escopo: metas.escopo,
        alvoId: metas.alvoId,
        alvoSistema: metas.alvoSistema,
        metrica: metas.metrica,
        valorAlvo: metas.valorAlvo,
        ano: metas.ano,
        mes: metas.mes,
        semanaIso: metas.semanaIso,
        observacao: metas.observacao,
        alvoNome: sql<string | null>`
          CASE ${metas.escopo}
            WHEN 'institucional' THEN 'CGEO'
            WHEN 'sistema' THEN ${metas.alvoSistema}::text
            WHEN 'nucleo' THEN (SELECT nome FROM ${nucleos} WHERE id = ${metas.alvoId})
            WHEN 'servidor' THEN (SELECT COALESCE(apelido, nome) FROM ${servidores} WHERE id = ${metas.alvoId})
            WHEN 'atividade' THEN (SELECT nome FROM ${atividades} WHERE id = ${metas.alvoId})
          END
        `.as("alvo_nome"),
        alvoCorTema: sql<string | null>`
          CASE ${metas.escopo}
            WHEN 'nucleo' THEN (SELECT cor_tema FROM ${nucleos} WHERE id = ${metas.alvoId})
            WHEN 'servidor' THEN (
              SELECT n.cor_tema FROM ${nucleos} n
              JOIN ${servidorNucleo} sn ON sn.nucleo_id = n.id
              WHERE sn.servidor_id = ${metas.alvoId}
                AND sn.is_principal = true
                AND sn.data_fim IS NULL
              LIMIT 1
            )
            ELSE NULL
          END
        `.as("alvo_cor_tema"),
      })
      .from(metas)
      .where(and(...conds));

    return rows.map((r) => ({
      id: r.id,
      periodo: r.periodo,
      escopo: r.escopo,
      alvoId: r.alvoId,
      alvoSistema: r.alvoSistema as MetaSistema | null,
      alvoNome: r.alvoNome,
      alvoCorTema: r.alvoCorTema,
      metrica: r.metrica,
      valorAlvo: Number(r.valorAlvo),
      ano: r.ano,
      mes: r.mes,
      semanaIso: r.semanaIso,
      observacao: r.observacao,
    }));
  }

  /**
   * Calcula o realizado de uma meta consultando `analises` (ou `processos`,
   * para a métrica de processos concluídos) com filtro por escopo e período.
   */
  async computeRealizado(meta: MetaRow): Promise<number> {
    const { start, end } =
      meta.periodo === "mensal"
        ? boundsMensal(meta.ano, meta.mes!)
        : boundsSemanal(meta.ano, meta.semanaIso!);
    const startStr = ymd(start);
    const endStr = ymd(end);

    // Filtro do escopo — construído dinamicamente
    const escopoFilter = this.buildEscopoFilter(meta);

    if (meta.metrica === "processos_concluidos") {
      // Processos únicos com status concluído e alguma análise no período.
      // Se o escopo puxa por servidor/núcleo, o processo entra se teve
      // pelo menos uma análise finalizada nele naquele período pelo alvo.
      const [row] = await db
        .select({
          n: sql<number>`COUNT(DISTINCT ${processos.id})::int`,
        })
        .from(processos)
        .innerJoin(analises, eq(analises.processoId, processos.id))
        .leftJoin(servidores, eq(servidores.id, analises.servidorId))
        .where(
          and(
            eq(processos.statusAtual, "concluido"),
            gte(analises.dataAnalise, startStr),
            lte(analises.dataAnalise, endStr),
            escopoFilter,
          ),
        );
      return row?.n ?? 0;
    }

    // Métricas baseadas em análises
    const totalExpr = sql<number>`COUNT(*)::int`;
    const finalizadasExpr = sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Finalizado' THEN 1 ELSE 0 END)::int`;

    const [row] = await db
      .select({
        total: totalExpr,
        finalizadas: finalizadasExpr,
      })
      .from(analises)
      .leftJoin(processos, eq(processos.id, analises.processoId))
      .leftJoin(servidores, eq(servidores.id, analises.servidorId))
      .where(
        and(
          gte(analises.dataAnalise, startStr),
          lte(analises.dataAnalise, endStr),
          escopoFilter,
        ),
      );

    const total = row?.total ?? 0;
    const finalizadas = row?.finalizadas ?? 0;

    switch (meta.metrica) {
      case "analises_registradas":
        return total;
      case "analises_finalizadas":
        return finalizadas;
      case "taxa_finalizacao":
        return total > 0 ? (finalizadas / total) * 100 : 0;
      default:
        return 0;
    }
  }

  private buildEscopoFilter(meta: MetaRow) {
    switch (meta.escopo) {
      case "institucional":
        return sql`TRUE`;
      case "sistema":
        return meta.alvoSistema
          ? eq(processos.sistema, meta.alvoSistema)
          : sql`FALSE`;
      case "servidor":
        return meta.alvoId ? eq(analises.servidorId, meta.alvoId) : sql`FALSE`;
      case "atividade":
        return meta.alvoId
          ? eq(analises.atividadeId, meta.alvoId)
          : sql`FALSE`;
      case "nucleo":
        // Servidor pertencente ao núcleo no dia da análise (vínculo principal ativo).
        return meta.alvoId
          ? sql`EXISTS (
              SELECT 1 FROM ${servidorNucleo} sn
              WHERE sn.servidor_id = ${analises.servidorId}
                AND sn.nucleo_id = ${meta.alvoId}
                AND sn.is_principal = true
                AND sn.data_inicio <= ${analises.dataAnalise}
                AND (sn.data_fim IS NULL OR sn.data_fim >= ${analises.dataAnalise})
            )`
          : sql`FALSE`;
    }
  }

  /**
   * Junta lista + progresso. Faz N chamadas a computeRealizado (uma por meta),
   * mas o N esperado é baixo (dezenas de metas por período no máximo).
   */
  async listComProgresso(filtro: {
    periodo: MetaPeriodo;
    ano: number;
    mes?: number;
    semanaIso?: number;
  }): Promise<MetaComProgresso[]> {
    const rows = await this.listMetasDoPeriodo(filtro);
    const now = new Date();
    return Promise.all(
      rows.map(async (m) => {
        const realizado = await this.computeRealizado(m);
        const { start, end } =
          m.periodo === "mensal"
            ? boundsMensal(m.ano, m.mes!)
            : boundsSemanal(m.ano, m.semanaIso!);

        const totalDur = end.getTime() - start.getTime() + 24 * 3600 * 1000; // inclui o último dia
        const passed = Math.max(0, Math.min(now.getTime() - start.getTime(), totalDur));
        const pctTempo = (passed / totalDur) * 100;
        const pctAtingido =
          m.valorAlvo > 0 ? (realizado / m.valorAlvo) * 100 : 0;

        const diasRestantes = Math.max(
          0,
          Math.ceil((end.getTime() - now.getTime()) / (24 * 3600 * 1000)),
        );

        return {
          ...m,
          realizado,
          percentualAtingido: pctAtingido,
          percentualTempo: pctTempo,
          farol: computeFarol(pctAtingido, pctTempo),
          diasRestantes,
          periodoLabel: periodoLabel(m),
        };
      }),
    );
  }

  /**
   * Sugere valor de meta baseado na média dos últimos N meses da mesma
   * combinação escopo × métrica × alvo. Usado pelo form ao abrir.
   */
  async sugerirValor(base: {
    escopo: MetaEscopo;
    alvoId?: string;
    alvoSistema?: MetaSistema;
    metrica: MetaMetrica;
    meses?: number;
  }): Promise<number> {
    const meses = base.meses ?? 3;
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth() - meses, 1);
    const fim = new Date(now.getFullYear(), now.getMonth(), 0); // último dia do mês anterior

    // Reutiliza computeRealizado mês a mês
    const valores: number[] = [];
    for (let i = 0; i < meses; i++) {
      const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
      const fake: MetaRow = {
        id: "sugestao",
        periodo: "mensal",
        escopo: base.escopo,
        alvoId: base.alvoId ?? null,
        alvoSistema: base.alvoSistema ?? null,
        alvoNome: null,
        alvoCorTema: null,
        metrica: base.metrica,
        valorAlvo: 1,
        ano: d.getFullYear(),
        mes: d.getMonth() + 1,
        semanaIso: null,
        observacao: null,
      };
      valores.push(await this.computeRealizado(fake));
    }

    const media = valores.reduce((s, v) => s + v, 0) / (valores.length || 1);
    const alvo = Math.round(media * 1.1);

    // Semanal = média mensal / 4.33 dias úteis
    return base.metrica === "taxa_finalizacao"
      ? Math.min(100, Math.max(1, Math.round(media)))
      : Math.max(1, alvo);
  }
}

export const metasService = new MetasService();

/**
 * Helper — retorna { ano, mes } atual (mensal) e { ano, semanaIso } atual
 * (semanal). Usado como valor default do seletor de período na `/metas`.
 */
export function periodoAtual(): {
  mensal: { ano: number; mes: number };
  semanal: { ano: number; semanaIso: number };
} {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;

  // Semana ISO
  const target = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const semanaIso = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  const isoYear = target.getUTCFullYear();

  return {
    mensal: { ano, mes },
    semanal: { ano: isoYear, semanaIso },
  };
}
