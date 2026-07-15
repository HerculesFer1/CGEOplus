/**
 * Eventos — carregamento por janela + resolução de lembretes ativos.
 *
 * A API `listProximosEventos` / `listLembretesAtivos` foi desenhada pensando
 * em DOIS consumidores: o sino do topbar (agora) e a tela pós-login que
 * entrará junto com o OAuth institucional (ver memória
 * project_post_login_home). Não mudar assinatura sem considerar ambos.
 */

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { eventos, nucleos } from "@/lib/db/schema";
import type { TipoEvento } from "@/lib/validators/evento";

export interface EventoRow {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  tipo: TipoEvento;
  inicio: Date;
  fim: Date;
  diaInteiro: boolean;
  nucleoId: string | null;
  nucleoNome: string | null;
  nucleoCorTema: string | null;
  lembretesMin: number[];
}

export interface LembreteAtivo {
  evento: EventoRow;
  lembreteMin: number;
  minutosAteEvento: number;
}

const BASE_SELECT = {
  id: eventos.id,
  titulo: eventos.titulo,
  descricao: eventos.descricao,
  local: eventos.local,
  tipo: eventos.tipo,
  inicio: eventos.inicio,
  fim: eventos.fim,
  diaInteiro: eventos.diaInteiro,
  nucleoId: eventos.nucleoId,
  nucleoNome: nucleos.nome,
  nucleoCorTema: nucleos.corTema,
  lembretesMin: eventos.lembretesMin,
} as const;

function toRow(r: {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  tipo: string;
  inicio: Date | string;
  fim: Date | string;
  diaInteiro: boolean;
  nucleoId: string | null;
  nucleoNome: string | null;
  nucleoCorTema: string | null;
  lembretesMin: number[] | null;
}): EventoRow {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao,
    local: r.local,
    tipo: r.tipo as TipoEvento,
    inicio: r.inicio instanceof Date ? r.inicio : new Date(r.inicio),
    fim: r.fim instanceof Date ? r.fim : new Date(r.fim),
    diaInteiro: r.diaInteiro,
    nucleoId: r.nucleoId,
    nucleoNome: r.nucleoNome,
    nucleoCorTema: r.nucleoCorTema,
    lembretesMin: r.lembretesMin ?? [],
  };
}

export class EventosService {
  /** Eventos que intersectam a janela [inicio, fim]. */
  async listNaJanela(inicio: Date, fim: Date): Promise<EventoRow[]> {
    const rows = await db
      .select(BASE_SELECT)
      .from(eventos)
      .leftJoin(nucleos, eq(nucleos.id, eventos.nucleoId))
      .where(and(lte(eventos.inicio, fim), gte(eventos.fim, inicio)))
      .orderBy(asc(eventos.inicio));
    return rows.map(toRow);
  }

  /** Um evento por id (para detalhe / edição). */
  async getById(id: string): Promise<EventoRow | null> {
    const [row] = await db
      .select(BASE_SELECT)
      .from(eventos)
      .leftJoin(nucleos, eq(nucleos.id, eventos.nucleoId))
      .where(eq(eventos.id, id))
      .limit(1);
    return row ? toRow(row) : null;
  }

  /**
   * Próximos N eventos a partir de `from` (default: agora).
   * Consumidores: sino do topbar (limit 5), tela pós-login (limit 5-10).
   */
  async listProximosEventos(opts?: {
    from?: Date;
    limit?: number;
  }): Promise<EventoRow[]> {
    const from = opts?.from ?? new Date();
    const limit = opts?.limit ?? 5;
    const rows = await db
      .select(BASE_SELECT)
      .from(eventos)
      .leftJoin(nucleos, eq(nucleos.id, eventos.nucleoId))
      .where(gte(eventos.fim, from))
      .orderBy(asc(eventos.inicio))
      .limit(limit);
    return rows.map(toRow);
  }

  /**
   * Lembretes ativos agora — evento futuro cujo início cai dentro da janela
   * definida por algum dos lembretes configurados. A checagem "está dentro da
   * janela?" é feita em JS (o N esperado é baixo — dezenas de eventos futuros
   * no máximo — e evita subquery SQL correlacionada, que teve problema com o
   * binding do Drizzle).
   */
  async listLembretesAtivos(agora: Date = new Date()): Promise<LembreteAtivo[]> {
    const rows = await db
      .select(BASE_SELECT)
      .from(eventos)
      .leftJoin(nucleos, eq(nucleos.id, eventos.nucleoId))
      .where(
        and(
          gte(eventos.inicio, agora),
          sql`array_length(${eventos.lembretesMin}, 1) IS NOT NULL`,
        ),
      )
      .orderBy(asc(eventos.inicio));

    const porEvento = new Map<string, LembreteAtivo>();
    const agoraMs = agora.getTime();

    for (const raw of rows) {
      const evento = toRow(raw);
      if (!evento.lembretesMin.length) continue;
      const minutosAteEvento = Math.max(
        0,
        Math.round((evento.inicio.getTime() - agoraMs) / 60000),
      );
      // Escolhe o lembrete "mais apertado" que já disparou (menor `min` >= minutosAteEvento).
      const disparado = evento.lembretesMin
        .filter((min) => minutosAteEvento <= min)
        .sort((a, b) => a - b)[0];
      if (disparado === undefined) continue;
      porEvento.set(evento.id, {
        evento,
        lembreteMin: disparado,
        minutosAteEvento,
      });
    }

    return Array.from(porEvento.values()).sort(
      (a, b) => a.evento.inicio.getTime() - b.evento.inicio.getTime(),
    );
  }
}

export const eventosService = new EventosService();

/**
 * Helper de formatação humano-legível de "faltam X".
 * Usado tanto no sino quanto na tela pós-login.
 */
export function formatarAntecedencia(min: number): string {
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `em ${horas} h`;
  const dias = Math.round(horas / 24);
  return `em ${dias} dia${dias === 1 ? "" : "s"}`;
}
