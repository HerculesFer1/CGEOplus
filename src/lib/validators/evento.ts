import { z } from "zod";

export const TIPO_EVENTO = [
  "reuniao",
  "apresentacao_semanal",
  "prazo",
  "capacitacao",
  "feriado",
  "outro",
] as const;

export type TipoEvento = (typeof TIPO_EVENTO)[number];

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  reuniao: "Reunião",
  apresentacao_semanal: "Apresentação semanal",
  prazo: "Prazo",
  capacitacao: "Capacitação",
  feriado: "Feriado",
  outro: "Outro",
};

// Cores para o calendário (usadas por bolinhas + fundos suaves)
export const TIPO_EVENTO_COR: Record<TipoEvento, string> = {
  reuniao: "#0A84FF",
  apresentacao_semanal: "#BF5AF2",
  prazo: "#FF453A",
  capacitacao: "#32D74B",
  feriado: "#FF9F0A",
  outro: "#8E8E93",
};

// Lembretes pré-definidos oferecidos no form (em minutos)
export const LEMBRETE_OPCOES = [
  { min: 0, label: "no horário do evento" },
  { min: 15, label: "15 minutos antes" },
  { min: 60, label: "1 hora antes" },
  { min: 60 * 24, label: "1 dia antes" },
  { min: 60 * 24 * 2, label: "2 dias antes" },
  { min: 60 * 24 * 7, label: "1 semana antes" },
] as const;

export const eventoCreateSchema = z
  .object({
    titulo: z.string().trim().min(2, "Título muito curto.").max(200),
    descricao: z.string().trim().max(2000).optional().or(z.literal("")),
    local: z.string().trim().max(200).optional().or(z.literal("")),
    tipo: z.enum(TIPO_EVENTO),
    // Inputs datetime-local chegam como "YYYY-MM-DDTHH:mm" — convertemos para ISO.
    inicio: z.string().min(1, "Informe o início."),
    fim: z.string().min(1, "Informe o fim."),
    diaInteiro: z.boolean().default(false),
    nucleoId: z.string().uuid().optional().or(z.literal("")),
    lembretesMin: z
      .array(z.coerce.number().int().min(0).max(43200))
      .max(6, "Máximo 6 lembretes por evento.")
      .default([]),
  })
  .superRefine((data, ctx) => {
    const ini = new Date(data.inicio);
    const fim = new Date(data.fim);
    if (Number.isNaN(ini.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["inicio"],
        message: "Data/hora inválida.",
      });
    }
    if (Number.isNaN(fim.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["fim"],
        message: "Data/hora inválida.",
      });
    }
    if (
      !Number.isNaN(ini.getTime()) &&
      !Number.isNaN(fim.getTime()) &&
      fim.getTime() < ini.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fim"],
        message: "Fim precisa ser depois do início.",
      });
    }
  });

export const eventoUpdateSchema = eventoCreateSchema.and(
  z.object({ id: z.string().uuid() }),
);

export type EventoCreateInput = z.infer<typeof eventoCreateSchema>;
export type EventoUpdateInput = z.infer<typeof eventoUpdateSchema>;
