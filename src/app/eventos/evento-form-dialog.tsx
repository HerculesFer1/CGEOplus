"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEMBRETE_OPCOES,
  TIPO_EVENTO,
  TIPO_EVENTO_LABEL,
  eventoCreateSchema,
  type EventoCreateInput,
  type TipoEvento,
} from "@/lib/validators/evento";

import { createEventoAction, updateEventoAction } from "./actions";
import type { EventoRowSerial } from "./eventos-view";

const NONE_VALUE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: EventoRowSerial | null;
  dataPreset: Date | null;
  nucleos: { id: string; nome: string; corTema: string | null }[];
}

/** Formata Date para "YYYY-MM-DDTHH:mm" (input datetime-local). */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function padrãoInicio(preset: Date | null): Date {
  if (preset) {
    const d = new Date(preset);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function padrãoFim(inicio: Date): Date {
  const d = new Date(inicio);
  d.setHours(d.getHours() + 1);
  return d;
}

export function EventoFormDialog({
  open,
  onOpenChange,
  evento,
  dataPreset,
  nucleos,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!evento;

  const defaults = (): EventoCreateInput => {
    const ini = padrãoInicio(dataPreset);
    return {
      titulo: "",
      descricao: "",
      local: "",
      tipo: "reuniao" as TipoEvento,
      inicio: toDatetimeLocal(ini),
      fim: toDatetimeLocal(padrãoFim(ini)),
      diaInteiro: false,
      nucleoId: "",
      lembretesMin: [60],
    };
  };

  const form = useForm<EventoCreateInput>({
    resolver: zodResolver(eventoCreateSchema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    if (!open) return;
    if (evento) {
      form.reset({
        titulo: evento.titulo,
        descricao: evento.descricao ?? "",
        local: evento.local ?? "",
        tipo: evento.tipo,
        inicio: toDatetimeLocal(new Date(evento.inicio)),
        fim: toDatetimeLocal(new Date(evento.fim)),
        diaInteiro: evento.diaInteiro,
        nucleoId: evento.nucleoId ?? "",
        lembretesMin: evento.lembretesMin,
      });
    } else {
      form.reset(defaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, evento, dataPreset]);

  const errors = form.formState.errors;
  const lembretes = form.watch("lembretesMin") ?? [];
  const nucleoIdValue = form.watch("nucleoId") || NONE_VALUE;
  const diaInteiro = form.watch("diaInteiro");

  function toggleLembrete(min: number) {
    const atual = form.getValues("lembretesMin") ?? [];
    const novo = atual.includes(min)
      ? atual.filter((v) => v !== min)
      : [...atual, min].sort((a, b) => a - b);
    form.setValue("lembretesMin", novo, { shouldValidate: true });
  }

  function onSubmit(values: EventoCreateInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateEventoAction({ id: evento!.id, ...values })
        : await createEventoAction(values);
      if (res.ok) {
        toast.success(isEdit ? "Evento atualizado." : "Evento criado.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do evento."
              : "Adicione um compromisso à agenda do setor."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field
            label="Título"
            error={errors.titulo?.message}
            className="sm:col-span-2"
          >
            <Input
              {...form.register("titulo")}
              placeholder="Ex.: Reunião semanal do CGEO"
            />
          </Field>

          <Field label="Tipo" error={errors.tipo?.message}>
            <Select
              value={form.watch("tipo")}
              onValueChange={(v) =>
                form.setValue("tipo", v as TipoEvento, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_EVENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_EVENTO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Núcleo" error={errors.nucleoId?.message}>
            <Select
              value={nucleoIdValue}
              onValueChange={(v) =>
                form.setValue("nucleoId", v === NONE_VALUE ? "" : v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sem núcleo</SelectItem>
                {nucleos.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Início" error={errors.inicio?.message}>
            <Input
              type="datetime-local"
              {...form.register("inicio")}
            />
          </Field>

          <Field label="Fim" error={errors.fim?.message}>
            <Input type="datetime-local" {...form.register("fim")} />
          </Field>

          <Field
            label="Local"
            error={errors.local?.message}
            className="sm:col-span-2"
          >
            <Input
              {...form.register("local")}
              placeholder="Sala, endereço, link (opcional)"
            />
          </Field>

          <Field
            label="Descrição"
            error={errors.descricao?.message}
            className="sm:col-span-2"
          >
            <Input
              {...form.register("descricao")}
              placeholder="Pauta ou notas do evento (opcional)"
            />
          </Field>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="dia-inteiro"
              type="checkbox"
              checked={diaInteiro}
              onChange={(e) => form.setValue("diaInteiro", e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <Label htmlFor="dia-inteiro" className="cursor-pointer">
              Evento de dia inteiro (ignora horários)
            </Label>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Lembretes</Label>
            <div className="flex flex-wrap gap-2">
              {LEMBRETE_OPCOES.map((opt) => {
                const ativo = lembretes.includes(opt.min);
                return (
                  <button
                    key={opt.min}
                    type="button"
                    onClick={() => toggleLembrete(opt.min)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      ativo
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--text-subtle)]">
              Lembretes ativos aparecem no sino da barra superior.
            </p>
          </div>

          <DialogFooter className="sm:col-span-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvando..."
                : isEdit
                ? "Salvar alterações"
                : "Criar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
