/**
 * Gerador de "Relatório de Progresso" — reproduz o layout exato das planilhas
 * de origem (PSI MONITORAMENTO / PILARES II - Monitoramento), aba a aba,
 * usando os dados atuais do banco.
 *
 * PSI:
 *   - "PSI RESUMO FINAL" com metas de famílias por intervalo + acumulado
 *   - "PSI RESUMO <ano>" para cada intervalo com dados (uma linha por comunidade)
 *
 * PILARES II:
 *   - "AVANÇO CADASTROVALIDAÇÃO" com metas de CAR por intervalo + acumulado
 *   - "RESUMO - INTERVALO N" para cada intervalo com dados
 */

import * as XLSX from "xlsx";

import {
  listResumoComunidades,
  listResumoIntervalosByPrograma,
  type ResumoComunidade,
  type ResumoIntervalo,
} from "./queries";

type Row = (string | number | null)[];

interface AbaData {
  nome: string;
  rows: Row[];
  colWidths?: number[];
}

/* ---------- PSI ---------- */

function buildPsiResumoFinal(intervalos: ResumoIntervalo[]): AbaData {
  const rows: Row[] = [
    [
      "SECRETARIA DE ESTADO DO MEIO AMBIENTE E RECURSOS HÍDRICOS DO PIAUÍ\n" +
        "CENTRO DE GEOTECNOLOGIA FUNDIÁRIA E AMBIENTAL\n" +
        "PIAUÍ SUSTENTÁVEL E INCLUSIVO (PSI)\n" +
        "MONITORAMENTO DE QUANTIDADE DE TÍTULOS E CAR",
      null, null, null, null, null, null, null, null, null, null,
    ],
    [
      null,
      "Nº DE COMUNIDADES",
      "TÍTULOS",
      "Absoluto",
      "Número de famílias",
      "META (famílias)",
      "% alcançado",
      "Acumulado",
      "META",
      "% alcançado",
      "Validados",
    ],
  ];

  let familiasAcumulado = 0;
  let metaAcumulada = 0;

  for (const i of intervalos) {
    familiasAcumulado += i.familias_total;
    metaAcumulada += i.meta_familias ?? 0;

    const pctIntervalo =
      i.meta_familias && i.meta_familias > 0
        ? i.familias_total / i.meta_familias
        : null;
    const pctAcumulado =
      metaAcumulada > 0 ? familiasAcumulado / metaAcumulada : null;

    rows.push([
      i.intervalo_rotulo,
      i.comunidades_total,
      i.titulos_total,
      i.car_total,
      i.familias_total,
      i.meta_familias ?? "-",
      pctIntervalo,
      familiasAcumulado,
      metaAcumulada > 0 ? metaAcumulada : null,
      pctAcumulado,
      i.validados_total,
    ]);
  }

  return {
    nome: "PSI RESUMO FINAL",
    rows,
    colWidths: [26, 18, 12, 12, 22, 18, 14, 14, 14, 14, 12],
  };
}

function buildPsiResumoAno(
  intervalo: ResumoIntervalo,
  comunidades: ResumoComunidade[],
): AbaData {
  // Usa o próprio rótulo do intervalo pra evitar "PSI RESUMO 2000" no caso
  // do intervalo "Anterior a 2023" (que começa em 2000).
  const label =
    intervalo.intervalo_rotulo === "Anterior a 2023"
      ? "Anterior a 2023"
      : intervalo.data_inicio.slice(0, 4);
  const rows: Row[] = [
    [label, null, null, null, null, null],
    ["NOME", "MUNÍCPIO", "CAR", "TÍTULOS INTERPI", "Nº DE FAMÍLIAS", "Validados"],
  ];

  let totalCar = 0;
  let totalTitulos = 0;
  let totalFamilias = 0;
  let totalValidados = 0;

  for (const c of comunidades) {
    rows.push([
      c.comunidade,
      c.municipio ?? "",
      c.car_total,
      c.titulos_total,
      c.familias_total,
      c.validados_total,
    ]);
    totalCar += c.car_total;
    totalTitulos += c.titulos_total;
    totalFamilias += c.familias_total;
    totalValidados += c.validados_total;
  }
  rows.push([null, "TOTAL", totalCar, totalTitulos, totalFamilias, totalValidados]);

  // Nome da aba não pode exceder 31 caracteres
  const nome = `PSI RESUMO ${label}`.slice(0, 31);
  return {
    nome,
    rows,
    colWidths: [40, 24, 8, 16, 14, 10],
  };
}

/* ---------- PILARES II ---------- */

function buildPilaresAvanco(intervalos: ResumoIntervalo[]): AbaData {
  const rows: Row[] = [
    [
      "SECRETARIA DE ESTADO DO MEIO AMBIENTE E RECURSOS HÍDRICOS DO PIAUÍ\n" +
        "CENTRO DE GEOTECNOLOGIA FUNDIÁRIA E AMBIENTAL\n" +
        "PILARES DO CRESCIMENTO E INCLUSÃO SOCIAL I E II\n" +
        "MONITORAMENTO DE QUANTIDADE DE TÍTULOS E CAR",
      null, null, null, null, null, null, null, null,
    ],
    [
      null,
      "Nº DE COMUNIDADES",
      "TÍTULOS",
      "Absoluto",
      "META",
      "% alcançado",
      "Acumulado",
      "META",
      "Validado",
    ],
  ];

  let carAcumulado = 0;
  let metaAcumulada = 0;

  for (let idx = 0; idx < intervalos.length; idx++) {
    const i = intervalos[idx];
    carAcumulado += i.car_total;
    metaAcumulada += i.meta_car ?? 0;

    const pctIntervalo =
      i.meta_car && i.meta_car > 0 ? i.car_total / i.meta_car : null;

    // Primeiro intervalo é retroatividade — não entra no acumulado com meta.
    const acumBefore = idx === 0 ? null : carAcumulado;
    const metaAcumBefore = idx === 0 ? null : metaAcumulada;
    const pctAcumulado =
      metaAcumBefore && metaAcumBefore > 0 && acumBefore !== null
        ? acumBefore / metaAcumBefore
        : null;

    rows.push([
      i.intervalo_rotulo +
        (i.data_inicio && i.data_fim
          ? `: ${formatBr(i.data_inicio)} - ${formatBr(i.data_fim)}`
          : ""),
      i.comunidades_total,
      i.titulos_total,
      i.car_total,
      i.meta_car ?? "-",
      pctIntervalo,
      idx === 0 ? "-" : (acumBefore ?? "-"),
      idx === 0 ? "-" : (metaAcumBefore ?? "-"),
      i.validados_total,
    ]);
    void pctAcumulado;
  }

  return {
    nome: "AVANÇO CADASTROVALIDAÇÃO".slice(0, 31),
    rows,
    colWidths: [50, 18, 12, 12, 12, 14, 14, 14, 12],
  };
}

function buildPilaresResumoIntervalo(
  intervalo: ResumoIntervalo,
  comunidades: ResumoComunidade[],
  ordem: number,
): AbaData {
  const cabecalho =
    intervalo.data_inicio && intervalo.data_fim
      ? `INTERVALO ${ordem} - ${formatBrShort(intervalo.data_inicio)} A ${formatBrShort(intervalo.data_fim)}`
      : intervalo.intervalo_rotulo;

  const rows: Row[] = [
    [cabecalho, null, null, null, null],
    ["NOME", "MUNÍCPIO", "CAR", "TÍTULOS INTERPI", "Validados"],
  ];

  let totalCar = 0;
  let totalTitulos = 0;
  let totalValidados = 0;

  for (const c of comunidades) {
    rows.push([
      c.comunidade,
      c.municipio ?? "",
      c.car_total,
      c.titulos_total,
      c.validados_total,
    ]);
    totalCar += c.car_total;
    totalTitulos += c.titulos_total;
    totalValidados += c.validados_total;
  }
  rows.push([null, "TOTAL", totalCar, totalTitulos, totalValidados]);

  return {
    nome: `RESUMO - INTERVALO ${ordem}`.slice(0, 31),
    rows,
    colWidths: [40, 24, 8, 16, 10],
  };
}

/* ---------- helpers ---------- */

function formatBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatBrShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ---------- montagem final ---------- */

export async function gerarRelatorio(
  programaSigla: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const intervalos = await listResumoIntervalosByPrograma(programaSigla);
  const abas: AbaData[] = [];

  if (programaSigla === "PSI") {
    abas.push(buildPsiResumoFinal(intervalos));
    const nomesUsados = new Set<string>(["PSI RESUMO FINAL"]);
    for (const i of intervalos) {
      if (i.titulos_total === 0) continue;
      const comunidades = await listResumoComunidades(programaSigla, i.intervalo_id);
      const aba = buildPsiResumoAno(i, comunidades);
      // Desambigua nome se colidir com uma aba já criada.
      let nomeFinal = aba.nome;
      let n = 2;
      while (nomesUsados.has(nomeFinal)) {
        nomeFinal = `${aba.nome} (${n++})`.slice(0, 31);
      }
      nomesUsados.add(nomeFinal);
      abas.push({ ...aba, nome: nomeFinal });
    }
  } else if (programaSigla === "Pilares II") {
    abas.push(buildPilaresAvanco(intervalos));
    for (let idx = 0; idx < intervalos.length; idx++) {
      const i = intervalos[idx];
      if (i.titulos_total === 0) continue;
      const comunidades = await listResumoComunidades(programaSigla, i.intervalo_id);
      abas.push(buildPilaresResumoIntervalo(i, comunidades, idx + 1));
    }
  } else {
    // fallback genérico
    abas.push({
      nome: "RESUMO FINAL",
      rows: [
        ["Intervalo", "Comunidades", "Títulos", "CAR", "Famílias", "Validados"],
        ...intervalos.map((i) => [
          i.intervalo_rotulo,
          i.comunidades_total,
          i.titulos_total,
          i.car_total,
          i.familias_total,
          i.validados_total,
        ]),
      ],
    });
  }

  const wb = XLSX.utils.book_new();
  for (const aba of abas) {
    const ws = XLSX.utils.aoa_to_sheet(aba.rows);
    if (aba.colWidths) {
      ws["!cols"] = aba.colWidths.map((w) => ({ wch: w }));
    }
    // Formata coluna de % como percentual (PSI RESUMO FINAL cols 6 e 9; PILARES col 5)
    formatarPercentuais(ws, aba);
    XLSX.utils.book_append_sheet(wb, ws, aba.nome);
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const hoje = new Date().toISOString().slice(0, 10);
  const filename = `${programaSigla}_relatorio_progresso_${hoje}.xlsx`;
  return { buffer, filename };
}

function formatarPercentuais(ws: XLSX.WorkSheet, aba: AbaData) {
  // Só aplicamos formatação % nas abas de painel geral.
  const colsPct: number[] | null = aba.nome.includes("AVANÇO")
    ? [5]
    : aba.nome === "PSI RESUMO FINAL"
      ? [6, 9]
      : null;
  if (!colsPct) return;

  for (let r = 2; r < aba.rows.length; r++) {
    for (const c of colsPct) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === "number") {
        cell.z = "0.00%";
        cell.t = "n";
      }
    }
  }
}
