import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  analises,
  nucleos,
  servidorNucleo,
  servidores,
} from "@/lib/db/schema";
import {
  metasService,
  periodoAtual,
} from "@/lib/services/metas.service";
import { eventosService } from "@/lib/services/eventos.service";

import { ApresentacaoView } from "./apresentacao-view";

export const dynamic = "force-dynamic";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function boundsSemana(anchor: Date): { start: Date; end: Date } {
  const d = new Date(anchor);
  const dow = (d.getDay() + 6) % 7; // 0 = seg
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default async function ApresentacaoPage() {
  const now = new Date();
  const semanaAtual = boundsSemana(now);
  const semanaAnterior = boundsSemana(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
  );
  const semanaProxima = boundsSemana(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
  );

  const per = periodoAtual();

  // Núcleos + membros ativos (com foto/apelido/nome) + análises da semana por núcleo
  const [
    nucleosRows,
    membrosRows,
    analisesSemanaPorNucleo,
    kpisSemana,
    kpisSemanaAnt,
    topServidoresSemana,
    metasAtivas,
    metasProxSemana,
    metasProxMes,
    eventosProx,
  ] = await Promise.all([
    db
      .select({
        id: nucleos.id,
        nome: nucleos.nome,
        corTema: nucleos.corTema,
        minMembros: nucleos.minMembros,
      })
      .from(nucleos)
      .where(eq(nucleos.ativo, true)),

    db
      .select({
        nucleoId: servidorNucleo.nucleoId,
        servidorId: servidores.id,
        apelido: servidores.apelido,
        nome: servidores.nome,
        avatarUrl: servidores.avatarUrl,
        tipoVinculo: servidores.tipoVinculo,
      })
      .from(servidorNucleo)
      .innerJoin(servidores, eq(servidores.id, servidorNucleo.servidorId))
      .where(
        and(
          eq(servidorNucleo.isPrincipal, true),
          eq(servidores.status, "ativo"),
          sql`${servidorNucleo.dataFim} IS NULL`,
        ),
      ),

    db
      .select({
        nucleoId: servidorNucleo.nucleoId,
        total: count(analises.id),
      })
      .from(analises)
      .innerJoin(
        servidorNucleo,
        sql`${servidorNucleo.servidorId} = ${analises.servidorId}
            AND ${servidorNucleo.isPrincipal} = true
            AND ${servidorNucleo.dataInicio} <= ${analises.dataAnalise}
            AND (${servidorNucleo.dataFim} IS NULL OR ${servidorNucleo.dataFim} >= ${analises.dataAnalise})`,
      )
      .where(
        and(
          gte(analises.dataAnalise, ymd(semanaAtual.start)),
          lte(analises.dataAnalise, ymd(semanaAtual.end)),
        ),
      )
      .groupBy(servidorNucleo.nucleoId),

    db
      .select({
        total: count(),
        finalizadas: sql<number>`SUM(CASE WHEN ${analises.resultado} = 'Finalizado' THEN 1 ELSE 0 END)::int`,
      })
      .from(analises)
      .where(
        and(
          gte(analises.dataAnalise, ymd(semanaAtual.start)),
          lte(analises.dataAnalise, ymd(semanaAtual.end)),
        ),
      ),

    db
      .select({ total: count() })
      .from(analises)
      .where(
        and(
          gte(analises.dataAnalise, ymd(semanaAnterior.start)),
          lte(analises.dataAnalise, ymd(semanaAnterior.end)),
        ),
      ),

    db
      .select({
        servidorId: servidores.id,
        apelido: servidores.apelido,
        nome: servidores.nome,
        avatarUrl: servidores.avatarUrl,
        nucleoCorTema: nucleos.corTema,
        total: count(analises.id),
      })
      .from(analises)
      .innerJoin(servidores, eq(servidores.id, analises.servidorId))
      .leftJoin(
        servidorNucleo,
        sql`${servidorNucleo.servidorId} = ${servidores.id}
            AND ${servidorNucleo.isPrincipal} = true
            AND ${servidorNucleo.dataFim} IS NULL`,
      )
      .leftJoin(nucleos, eq(nucleos.id, servidorNucleo.nucleoId))
      .where(
        and(
          gte(analises.dataAnalise, ymd(semanaAtual.start)),
          lte(analises.dataAnalise, ymd(semanaAtual.end)),
        ),
      )
      .groupBy(
        servidores.id,
        servidores.apelido,
        servidores.nome,
        servidores.avatarUrl,
        nucleos.corTema,
      )
      .orderBy(desc(count(analises.id)))
      .limit(5),

    // Metas ativas hoje: semanal atual + mensal atual
    Promise.all([
      metasService.listComProgresso({
        periodo: "semanal",
        ano: per.semanal.ano,
        semanaIso: per.semanal.semanaIso,
      }),
      metasService.listComProgresso({
        periodo: "mensal",
        ano: per.mensal.ano,
        mes: per.mensal.mes,
      }),
    ]).then(([a, b]) => [...a, ...b]),

    metasService.listComProgresso({
      periodo: "semanal",
      ano: per.semanal.ano,
      semanaIso: per.semanal.semanaIso + 1,
    }),

    metasService.listComProgresso({
      periodo: "mensal",
      ano: per.mensal.ano,
      mes: per.mensal.mes === 12 ? 1 : per.mensal.mes + 1,
    }),

    eventosService.listProximosEventos({ from: now, limit: 12 }),
  ]);

  // Monta lookup núcleo → membros/analises
  const membrosPorNucleo = new Map<string, typeof membrosRows>();
  for (const m of membrosRows) {
    const arr = membrosPorNucleo.get(m.nucleoId) ?? [];
    arr.push(m);
    membrosPorNucleo.set(m.nucleoId, arr);
  }
  const analisesPorNucleo = new Map<string, number>();
  for (const a of analisesSemanaPorNucleo) {
    analisesPorNucleo.set(a.nucleoId, Number(a.total));
  }

  const nucleosDisplay = nucleosRows.map((n) => ({
    id: n.id,
    nome: n.nome,
    corTema: n.corTema ?? "#8E8E93",
    minMembros: n.minMembros,
    membros: (membrosPorNucleo.get(n.id) ?? []).map((m) => ({
      id: m.servidorId,
      apelido: m.apelido,
      nome: m.nome,
      avatarUrl: m.avatarUrl,
      tipoVinculo: m.tipoVinculo,
    })),
    analisesSemana: analisesPorNucleo.get(n.id) ?? 0,
  }));

  const totalSemana = Number(kpisSemana[0]?.total ?? 0);
  const finalizadasSemana = Number(kpisSemana[0]?.finalizadas ?? 0);
  const totalSemanaAnt = Number(kpisSemanaAnt[0]?.total ?? 0);
  const deltaSemana =
    totalSemanaAnt > 0
      ? ((totalSemana - totalSemanaAnt) / totalSemanaAnt) * 100
      : 0;
  const taxaFinalSemana =
    totalSemana > 0 ? (finalizadasSemana / totalSemana) * 100 : 0;

  // Metas próximas: junta próxima semana + próximo mês (evita mostrar duplicado)
  const proximasMetas = [...metasProxSemana, ...metasProxMes];

  return (
    <ApresentacaoView
      semana={{
        iso: per.semanal.semanaIso,
        ano: per.semanal.ano,
        inicio: semanaAtual.start.toISOString(),
        fim: semanaAtual.end.toISOString(),
      }}
      nucleos={nucleosDisplay}
      resultados={{
        totalSemana,
        finalizadasSemana,
        deltaSemana,
        taxaFinalSemana,
        topServidores: topServidoresSemana.map((s) => ({
          id: s.servidorId,
          apelido: s.apelido,
          nome: s.nome,
          avatarUrl: s.avatarUrl,
          corTema: s.nucleoCorTema,
          total: Number(s.total),
        })),
      }}
      metasAtivas={metasAtivas.map((m) => ({
        ...m,
        // já é serializável (numbers/strings/null)
      }))}
      proximasMetas={proximasMetas}
      eventos={eventosProx.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        tipo: e.tipo,
        local: e.local,
        nucleoNome: e.nucleoNome,
        nucleoCorTema: e.nucleoCorTema,
        inicioIso: e.inicio.toISOString(),
        fimIso: e.fim.toISOString(),
        diaInteiro: e.diaInteiro,
      }))}
    />
  );
}
