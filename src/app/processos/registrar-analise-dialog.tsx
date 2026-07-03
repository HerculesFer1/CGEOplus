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
  analiseFromPlanilhaSchema,
  RESULTADOS_ANALISE,
  SETORES_DESTINO,
  SICAR_FINALIDADES,
  SISTEMAS,
  type AnaliseFromPlanilhaInput,
} from "@/lib/validators/processo";

import { registrarAnaliseAction } from "./actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servidores: { id: string; apelido: string; nome: string }[];
}

const DEFAULT_VALUES: AnaliseFromPlanilhaInput = {
  numeroProcesso: "",
  sistema: "SIGA",
  sicarFinalidade: null,
  servidorId: "",
  dataAnalise: new Date().toISOString().slice(0, 10),
  resultado: "Finalizado",
  setorDestino: null,
  observacoes: "",
};

export function RegistrarAnaliseDialog({
  open,
  onOpenChange,
  servidores,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AnaliseFromPlanilhaInput>({
    resolver: zodResolver(analiseFromPlanilhaSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const sistema = form.watch("sistema");
  const isSicar = sistema === "SICAR";

  useEffect(() => {
    if (open) form.reset(DEFAULT_VALUES);
  }, [open, form]);

  // Zera finalidade quando não for SICAR
  useEffect(() => {
    if (!isSicar) {
      form.setValue("sicarFinalidade", null);
    }
  }, [isSicar, form]);

  function onSubmit(values: AnaliseFromPlanilhaInput) {
    startTransition(async () => {
      const res = await registrarAnaliseAction(values);
      if (res.ok) {
        toast.success("Análise registrada.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar análise</DialogTitle>
          <DialogDescription>
            Espelha o modelo da planilha: uma linha por análise. Se o processo
            ainda não existe, é criado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field
            label="Sistema"
            error={errors.sistema?.message}
          >
            <Select
              value={form.watch("sistema")}
              onValueChange={(v) =>
                form.setValue("sistema", v as AnaliseFromPlanilhaInput["sistema"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SISTEMAS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isSicar ? (
            <Field
              label="Finalidade SICAR"
              error={errors.sicarFinalidade?.message}
            >
              <Select
                value={form.watch("sicarFinalidade") ?? ""}
                onValueChange={(v) =>
                  form.setValue(
                    "sicarFinalidade",
                    v as AnaliseFromPlanilhaInput["sicarFinalidade"],
                    { shouldValidate: true },
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {SICAR_FINALIDADES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div /> // grid placeholder
          )}

          <Field
            label="Número do processo"
            error={errors.numeroProcesso?.message}
            className="sm:col-span-2"
          >
            <Input
              {...form.register("numeroProcesso")}
              placeholder={
                isSicar
                  ? "Ex.: PI-2210656-96E69A4ED2934E1FB39186DA79762DB3"
                  : "Ex.: CCAR.13427-9/2025 · 00130.008773/2025-15"
              }
            />
          </Field>

          <Field label="Analista" error={errors.servidorId?.message}>
            <Select
              value={form.watch("servidorId")}
              onValueChange={(v) =>
                form.setValue("servidorId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {servidores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.apelido} · {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Data da análise" error={errors.dataAnalise?.message}>
            <Input type="date" {...form.register("dataAnalise")} />
          </Field>

          <Field label="Resultado" error={errors.resultado?.message}>
            <Select
              value={form.watch("resultado")}
              onValueChange={(v) =>
                form.setValue(
                  "resultado",
                  v as AnaliseFromPlanilhaInput["resultado"],
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULTADOS_ANALISE.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Setor de destino" error={errors.setorDestino?.message}>
            <Select
              value={form.watch("setorDestino") ?? ""}
              onValueChange={(v) =>
                form.setValue(
                  "setorDestino",
                  v as AnaliseFromPlanilhaInput["setorDestino"],
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {SETORES_DESTINO.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Observações"
            error={errors.observacoes?.message}
            className="sm:col-span-2"
          >
            <Input {...form.register("observacoes")} placeholder="Opcional" />
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
              {isPending ? "Salvando..." : "Registrar análise"}
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
