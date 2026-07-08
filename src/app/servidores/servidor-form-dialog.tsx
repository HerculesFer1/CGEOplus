"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Trash2, User } from "lucide-react";

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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  servidorCreateSchema,
  TIPO_VINCULO,
  type ServidorCreateInput,
} from "@/lib/validators/servidor";
import type { Servidor } from "@/lib/services/servidores.service";

import { createServidorAction, updateServidorAction } from "./actions";
import { displayVinculo } from "./vinculo-display";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servidor: Servidor | null;
  nucleosDisponiveis: string[];
}

const AVATAR_MAX_SIZE = 256;
const AVATAR_QUALITY = 0.85;

async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo selecionado não é uma imagem.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao processar imagem.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
}

function initialsOf(nome: string, apelido: string) {
  const source = (apelido || nome || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ServidorFormDialog({
  open,
  onOpenChange,
  servidor,
  nucleosDisponiveis,
}: Props) {
  const DEFAULT_VALUES: ServidorCreateInput = {
    nome: "",
    apelido: "",
    email: "",
    matricula: "",
    cargo: "",
    tipoVinculo: "Consultor PSI",
    especialidade: "",
    formacao: "",
    dataIngresso: new Date().toISOString().slice(0, 10),
    dataNascimento: "",
    fotoUrl: "",
    status: "ativo",
    nucleoPrincipal: nucleosDisponiveis[0] ?? "",
  };
  const [isPending, startTransition] = useTransition();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = !!servidor;

  const form = useForm<ServidorCreateInput>({
    resolver: zodResolver(servidorCreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        servidor
          ? {
              nome: servidor.nome,
              apelido: servidor.apelido,
              email: servidor.email,
              matricula: servidor.matricula ?? "",
              cargo: servidor.cargo,
              tipoVinculo: servidor.tipoVinculo,
              especialidade: servidor.especialidade ?? "",
              formacao: servidor.formacao ?? "",
              dataIngresso: servidor.dataIngresso,
              dataNascimento: servidor.dataNascimento ?? "",
              fotoUrl: servidor.fotoUrl ?? "",
              status: servidor.status,
              nucleoPrincipal: servidor.nucleoPrincipal,
            }
          : DEFAULT_VALUES,
      );
    }
  }, [open, servidor, form]);

  function onSubmit(values: ServidorCreateInput) {
    startTransition(async () => {
      const res = isEdit
        ? await updateServidorAction({ id: servidor!.id, ...values })
        : await createServidorAction(values);

      if (res.ok) {
        toast.success(isEdit ? "Servidor atualizado." : "Servidor cadastrado.");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  async function handleFile(file: File) {
    setAvatarBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      form.setValue("fotoUrl", dataUrl, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar imagem.");
    } finally {
      setAvatarBusy(false);
    }
  }

  const errors = form.formState.errors;
  const nomeValue = form.watch("nome");
  const apelidoValue = form.watch("apelido");
  const fotoValue = form.watch("fotoUrl");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar servidor" : "Novo servidor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do colaborador."
              : "Cadastre um novo membro da equipe CGEO."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex items-center gap-4 sm:col-span-2">
            <AvatarPreview
              fotoUrl={fotoValue}
              initials={initialsOf(nomeValue, apelidoValue)}
            />
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={avatarBusy || isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {avatarBusy
                    ? "Processando..."
                    : fotoValue
                    ? "Trocar foto"
                    : "Adicionar foto"}
                </Button>
                {fotoValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={avatarBusy || isPending}
                    onClick={() =>
                      form.setValue("fotoUrl", "", {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className="gap-2 text-[var(--danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Remover
                  </Button>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                JPG ou PNG. A imagem é reduzida para {AVATAR_MAX_SIZE}px antes
                do envio.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              {errors.fotoUrl?.message && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.fotoUrl.message}
                </p>
              )}
            </div>
          </div>

          <Field label="Nome completo" error={errors.nome?.message} className="sm:col-span-2">
            <Input {...form.register("nome")} placeholder="Ex.: Marco Aurélio" />
          </Field>

          <Field label="Apelido (usado na planilha)" error={errors.apelido?.message}>
            <Input {...form.register("apelido")} placeholder="Ex.: Marco" />
          </Field>

          <Field label="E-mail institucional" error={errors.email?.message}>
            <Input type="email" {...form.register("email")} placeholder="ex.: marco@semarh.gov.br" />
          </Field>

          <Field label="Matrícula" error={errors.matricula?.message}>
            <Input {...form.register("matricula")} placeholder="Opcional" />
          </Field>

          <Field label="Cargo" error={errors.cargo?.message}>
            <Input {...form.register("cargo")} placeholder="Ex.: Consultor PSI/Esp. Geoprocessamento" />
          </Field>

          <Field label="Tipo de vínculo" error={errors.tipoVinculo?.message}>
            <Select
              value={form.watch("tipoVinculo")}
              onValueChange={(v) =>
                form.setValue("tipoVinculo", v as ServidorCreateInput["tipoVinculo"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_VINCULO.map((v) => (
                  <SelectItem key={v} value={v}>
                    {displayVinculo(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Núcleo principal" error={errors.nucleoPrincipal?.message}>
            <Select
              value={form.watch("nucleoPrincipal")}
              onValueChange={(v) =>
                form.setValue("nucleoPrincipal", v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nucleosDisponiveis.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Especialidade" error={errors.especialidade?.message}>
            <Input {...form.register("especialidade")} placeholder="Opcional" />
          </Field>

          <Field label="Formação" error={errors.formacao?.message}>
            <Input
              {...form.register("formacao")}
              placeholder="Ex.: Eng. Florestal — UFMT"
            />
          </Field>

          <Field label="Data de ingresso" error={errors.dataIngresso?.message}>
            <DatePicker
              value={form.watch("dataIngresso")}
              onChange={(v) =>
                form.setValue("dataIngresso", v, { shouldValidate: true })
              }
              placeholder="Selecionar data"
              ariaLabel="Data de ingresso"
            />
          </Field>

          <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
            <DatePicker
              value={form.watch("dataNascimento") ?? ""}
              onChange={(v) =>
                form.setValue("dataNascimento", v, { shouldValidate: true })
              }
              placeholder="Selecionar data"
              ariaLabel="Data de nascimento"
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
            <Button type="submit" disabled={isPending || avatarBusy}>
              {isPending
                ? "Salvando..."
                : isEdit
                ? "Salvar alterações"
                : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AvatarPreview({
  fotoUrl,
  initials,
}: {
  fotoUrl?: string;
  initials: string;
}) {
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={fotoUrl}
        alt="Foto do servidor"
        className="h-20 w-20 rounded-full border object-cover"
      />
    );
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-[var(--surface)] text-lg font-semibold text-[var(--text-muted)]">
      {initials === "?" ? (
        <User className="h-8 w-8" strokeWidth={1.5} />
      ) : (
        initials
      )}
    </div>
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
      {error && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}
