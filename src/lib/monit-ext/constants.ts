/**
 * Constantes do módulo Monitoramento Externo.
 *
 * URLs / cronogramas / cores dos temas. Um único lugar pra alterar quando o
 * upstream mudar de endpoint.
 */

/** URL de deploy do repositório upstream (Vercel do `monitoramento-alertas-desmatamento-pi`).
 *  Serve JSONs agregados prontos em `/data/*.json`. */
export const UPSTREAM_VERCEL = "https://cgeo-sync.vercel.app";

/** REST endpoint do Supabase upstream. Anon key é público (aparece no bundle
 *  do frontend upstream) — leitura idempotente das tabelas `qb_*`, RPCs PRODES
 *  e `agregado_municipios`. Tratamos como fonte read-only. */
export const UPSTREAM_SUPABASE_URL =
  "https://ubcejvbnpuyouwpphryc.supabase.co/rest/v1";

export const UPSTREAM_SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViY2VqdmJucHV5b3V3cHBocnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQwNzYsImV4cCI6MjA5NDc4MDA3Nn0" +
  ".B2TpDY9ta2y0xPplgKDF54JuTHR-nmzUpozZHxI0yP8";

/** Cronograma oficial das bases federais — dirige a Timeline do módulo
 *  ("MapBiomas atualizado há Nd · próxima em Nd") e o cron do CGEO+ dispara
 *  1 dia depois de cada janela pra pegar o dado fresco. */
export const CRONOGRAMA = {
  mapbiomas: {
    label: "MapBiomas Alerta",
    cadencia: "mensal",
    /** Upstream libera dia 5 do mês; sincronizamos dia 6. */
    diaLiberacaoUpstream: 5,
    /** Cron do CGEO+ (fuso UTC, formato Vercel Cron). */
    cronCgeoPlus: "0 4 6 * *",
  },
  prodes: {
    label: "PRODES Cerrado",
    cadencia: "anual",
    mesLiberacaoUpstream: 10,
    diaLiberacaoUpstream: 1,
    cronCgeoPlus: "0 4 2 10 *",
  },
  queimadas: {
    label: "Queimadas BDQ-INPE",
    cadencia: "mensal",
    /** INPE atualiza mês anterior por volta do dia 14; sincronizamos dia 15. */
    diaLiberacaoUpstream: 14,
    cronCgeoPlus: "0 4 15 * *",
  },
} as const;

/** Cor institucional de cada tema — casada com a paleta do dashboard upstream
 *  para preservar a leitura visual do usuário técnico já familiarizado. */
export const TEMA_COR = {
  mapbiomas: "#F59E0B", // âmbar MapBiomas
  prodes: "#10B981", // esmeralda INPE
  queimadas: "#EF4444", // vermelho fogo
} as const;

/** Pesos do IPA (Índice de Pressão Ambiental composto) — validado com o usuário. */
export const IPA_PESOS = {
  ipi: 0.5,
  fogoEmPrioritaria: 0.3,
  divergenciaProdes: 0.2,
} as const;

/** Faixas de cobertura PRODES — ordem fixa usada no dashboard. */
export const PRODES_FAIXAS_COBERTURA = [
  { faixa: "0%", ordem: 0 },
  { faixa: "1-24%", ordem: 1 },
  { faixa: "25-49%", ordem: 2 },
  { faixa: "50-74%", ordem: 3 },
  { faixa: "75-89%", ordem: 4 },
  { faixa: "90-100%", ordem: 5 },
] as const;

/** Labels de meses em pt-BR para eixos e tooltips. */
export const MESES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;
