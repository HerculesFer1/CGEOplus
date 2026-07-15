"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
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
  META_ESCOPO,
  META_ESCOPO_LABEL,
  META_METRICA,
  META_METRICA_LABEL,
  META_PERIODO,
  META_SISTEMA,
  metaCreateSchema,
  type MetaCreateInput,
  type MetaEscopo,
  type MetaMetrica,
  type MetaPeriodo,
  type MetaSistema,
} from "@/lib/validators/meta";
import type { MetaComProgresso } from "@/lib/services/metas.service";

import {
  createMetaAction,
  sugerirValorMetaAction,
  updateMetaAction,
} from "./actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: MetaComProgresso | null;
  filtro:
    | { periodo: "mensal"; ano: number; mes: number }
    | { periodo: "semanal"; ano: number; semanaIso: number };
  nucleos: { id: string; nome: string; corTema: string | null }[];
  servidores: { id: string; nome: string; apelido: string | null }[];
  atividades: { id: string; nome: string }[];
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function MetaFormDialog({
  open,
  onOpenChange,
  meta,
  filtro,
  nucleos,
  servidores,
  atividades,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [sugerindo, setSugerindo] = useState(false);
  const isEdit = !!meta;

  const defaults: MetaCreateInput = {
    periodo: filtro.periodo,
    escopo: "institucional",
    alvoId: "",
    alvoSistema: "",
    metrica: "analises_registradas",
    valorAlvo: 0,
    ano: filtro.ano,
    mes: filtro.periodo === "mensal" ? filtro.mes : null,
    semanaIso: filtro.periodo === "semanal" ? filtro.semanaIso : null,
    observacao: "",
  };

  const form = useForm<MetaCreateInput>({
    resolver: zodResolver(metaCreateSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    if (meta) {
      form.reset({
        periodo: meta.periodo,
        escopo: meta.escopo,
        alvoId: meta.alvoId ?? "",
        alvoSistema: (meta.alvoSistema as MetaSistema | null) ?? "",
        metrica: meta.metrica,
        valorAlvo: meta.valorAlvo,
        ano: meta.ano,
        mes: meta.mes,
        semanaIso: meta.semanaIso,
        observacao: meta.observacao ?? "",
      });
    } else {
      form.reset(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meta]);

  const periodo = form.watch("periodo") as MetaPeriodo;
  const escopo = form.watch("escopo") as MetaEscopo;
  const metrica = form.watch("metrica") as MetaMetrica;
  const errors = form.formState.errors;

  // Ao trocar período, ajusta mes/semana defaults
  useEffect(() => {
    if (periodo === "mensal") {
      form.setValue("semanaIso", null, { shouldValidate: false });
      if (!form.getValues("mes"))
        form.setValue(
          "mes",
          filtro.periodo === "mensal" ? filtro.mes : new Date().getMonth() + 1,
        );
    } else {
      form.setValue("mes", null, { shouldValidate: false });
      if (!form.getValues("semanaIso"))
        form.setValue(
          "semanaIso",
          filtro.periodo === "semanal" ? filtro.semanaIso : 1,
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  // Ao trocar escopo, limpa alvos incompatíveis
  useEffect(() => {
    if (escopo === "institucional") {
      form.setValue("alvoId", "");
      form.setValue("alvoSistema", "");
    } else if (escopo === "sistema") {
      form.setValue("alvoId", "");
    } else {
      form.setValue("alvoSistema", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo]);

  async function sugerir() {
    setSugerindo(true);
    try {
      const res = await sugerirValorMetaAction({
        escopo,
        alvoId: form.getValues("alvoId") || undefined,
        alvoSistema:
          (form.getValues("alvoSistema") as MetaSistema | "") || undefined,
        metrica,
      });
      if (res.ok && res.data && res.data > 0) {
        form.setValue("valorAlvo", res.data, { shouldValidate: true });
        toast.success(`Sugestão: ${res.data} (média histórica + 10%)`);
      } else {
        toast.info("Sem histórico suficiente para sugerir.");
      }
    } finally {
      setSugerindo(false);
    }
  }

  function onSubmit(values: MetaCreateInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateMetaAction({
            id: meta!.id,
            valorAlvo: values.valorAlvo,
            observacao: values.observacao,
          })
        : await createMetaAction(values);
      if (res.ok) {
        toast.success(isEdit ? "Meta atualizada." : "Meta criada.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const alvoIdValue = form.watch("alvoId") || "";
  const alvoSistemaValue = form.watch("alvoSistema") || "";
  const isTaxa = metrica === "taxa_finalizacao";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste o valor da meta ou a observação. Escopo, alvo, período e métrica não podem ser alterados — crie uma nova meta se precisar mudar."
              : "Defina uma meta de produtividade. O progresso é calculado automaticamente pelas análises registradas no período."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field
            label="Período"
            error={errors.periodo?.message}
          >
            <Select
              value={periodo}
              onValueChange={(v) =>
                form.setValue("periodo", v as MetaPeriodo, {
                  shouldValidate: true,
                })
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {META_PERIODO.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === "mensal" ? "Mensal" : "Semanal"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {periodo === "mensal" ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Mês" error={errors.mes?.message}>
                <Select
                  value={String(form.watch("mes") ?? "")}
                  onValueChange={(v) =>
                    form.setValue("mes", Number(v), { shouldValidate: true })
                  }
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((nome, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ano" error={errors.ano?.message}>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  disabled={isEdit}
                  {...form.register("ano", { valueAsNumber: true })}
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Semana ISO" error={errors.semanaIso?.message}>
                <Input
                  type="number"
                  min={1}
                  max={53}
                  disabled={isEdit}
                  {...form.register("semanaIso", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Ano" error={errors.ano?.message}>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  disabled={isEdit}
                  {...form.register("ano", { valueAsNumber: true })}
                />
              </Field>
            </div>
          )}

          <Field label="Escopo" error={errors.escopo?.message}>
            <Select
              value={escopo}
              onValueChange={(v) =>
                form.setValue("escopo", v as MetaEscopo, {
                  shouldValidate: true,
                })
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {META_ESCOPO.map((e) => (
                  <SelectItem key={e} value={e}>
                    {META_ESCOPO_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={
              escopo === "sistema"
                ? "Sistema"
                : escopo === "nucleo"
                ? "Núcleo"
                : escopo === "servidor"
                ? "Servidor"
                : escopo === "atividade"
                ? "Atividade"
                : "Alvo"
            }
            error={
              (errors.alvoId?.message as string) ||
              (errors.alvoSistema?.message as string)
            }
          >
            {escopo === "institucional" ? (
              <Input value="Todo o CGEO" disabled />
            ) : escopo === "sistema" ? (
              <Select
                value={alvoSistemaValue}
                onValueChange={(v) =>
                  form.setValue("alvoSistema", v as MetaSistema, {
                    shouldValidate: true,
                  })
                }
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sistema" />
                </SelectTrigger>
                <SelectContent>
                  {META_SISTEMA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={alvoIdValue}
                onValueChange={(v) =>
                  form.setValue("alvoId", v, { shouldValidate: true })
                }
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione o ${escopo}`} />
                </SelectTrigger>
                <SelectContent>
                  {escopo === "nucleo" &&
                    nucleos.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.nome}
                      </SelectItem>
                    ))}
                  {escopo === "servidor" &&
                    servidores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.apelido ?? s.nome}
                      </SelectItem>
                    ))}
                  {escopo === "atividade" &&
                    atividades.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field
            label="Métrica"
            error={errors.metrica?.message}
            className="sm:col-span-2"
          >
            <Select
              value={metrica}
              onValueChange={(v) =>
                form.setValue("metrica", v as MetaMetrica, {
                  shouldValidate: true,
                })
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {META_METRICA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {META_METRICA_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={isTaxa ? "Valor da meta (%)" : "Valor da meta"}
            error={errors.valorAlvo?.message}
            className="sm:col-span-2"
          >
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                min={0}
                max={isTaxa ? 100 : undefined}
                {...form.register("valorAlvo", { valueAsNumber: true })}
                placeholder={isTaxa ? "80" : "150"}
              />
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={sugerir}
                  disabled={sugerindo}
                  className="shrink-0 gap-1.5"
                  title="Sugerir baseado nos últimos 3 meses"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Sugerir
                </Button>
              )}
            </div>
          </Field>

          <Field
            label="Observação"
            error={errors.observacao?.message}
            className="sm:col-span-2"
          >
            <Input
              {...form.register("observacao")}
              placeholder="Contexto ou motivação da meta (opcional)"
            />
          </Field>

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
                : "Criar meta"}
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
