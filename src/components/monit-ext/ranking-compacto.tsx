"use client";

import { formatNumber } from "@/lib/utils";

export interface RankingItem {
  /** Nome exibido (município). */
  nome: string;
  /** Valor que dimensiona a barra e aparece à direita do nome. */
  valor: number;
  /** Percentual opcional exibido na coluna final (colorido por `corPct`). */
  pct?: number | null;
  /** Marca um ponto vermelho ao lado do nome (reincidente / em alerta). */
  destaque?: boolean;
  /** Tooltip do ponto de destaque. */
  destaqueTitle?: string;
}

/**
 * Ranking compacto em barras — versão vertical enxuta para conviver ao lado
 * do mapa no bento dos slides "mapa + ranking" dos três dashboards do
 * Monitoramento Externo. Genérico: cada módulo mapeia seus dados para
 * `RankingItem` e escolhe a cor da barra (tema) e a semântica do `%`.
 *
 * O detalhe fino de cada município (bioma, vetor, classe AHP, concordância)
 * continua acessível pelo cartão de clique do mapa — aqui prioriza-se a
 * leitura "quem lidera" no mesmo campo de visão do choropleth.
 */
export function RankingCompacto({
  titulo,
  subtitulo,
  itens,
  cor,
  sufixoValor = "ha",
  corPct,
  limite = 10,
}: {
  titulo: string;
  subtitulo?: string;
  itens: RankingItem[];
  /** Cor da barra (tom do tema do módulo). */
  cor: string;
  sufixoValor?: string;
  /**
   * Cor do `%` à direita em função do valor. Default: "maior = pior"
   * (≥ 70 vermelho, ≥ 40 âmbar). PRODES (concordância, "maior = melhor")
   * passa a própria função.
   */
  corPct?: (pct: number) => string;
  limite?: number;
}) {
  const lista = itens.slice(0, limite);
  const max = Math.max(1, ...lista.map((m) => m.valor));
  const corDoPct =
    corPct ??
    ((p: number) =>
      p >= 70 ? "#EF4444" : p >= 40 ? "#F59E0B" : "var(--text-subtle)");

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h4 className="text-sm font-semibold text-[var(--text)]">{titulo}</h4>
      <p className="mt-0.5 mb-3 min-h-[14px] text-[11px] text-[var(--text-subtle)]">
        {subtitulo}
      </p>
      <ul className="flex flex-col gap-2.5">
        {lista.map((m, i) => {
          const largura = Math.max(3, (m.valor / max) * 100);
          const pct = m.pct ?? null;
          return (
            <li key={m.nome} className="flex items-center gap-2.5">
              <span className="w-5 shrink-0 text-[10px] font-bold tabular-nums text-[var(--text-subtle)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-medium text-[var(--text)]">
                      {m.nome}
                    </span>
                    {m.destaque && (
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                        title={m.destaqueTitle}
                      />
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
                    {formatNumber(Math.round(m.valor))}
                    {sufixoValor ? ` ${sufixoValor}` : ""}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--elevated)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${largura}%`, backgroundColor: cor }}
                  />
                </div>
              </div>
              {pct !== null && (
                <span
                  className="w-9 shrink-0 text-right text-[11px] tabular-nums"
                  style={{ color: corDoPct(pct) }}
                >
                  {pct.toFixed(0)}%
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
