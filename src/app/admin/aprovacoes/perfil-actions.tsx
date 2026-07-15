"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { TIPO_VINCULO } from "@/lib/validators/servidor";

import {
  aprovarPerfilAction,
  promoverAdminAction,
  rebaixarAdminAction,
  recusarPerfilAction,
  revogarPerfilAction,
  vincularServidorAction,
} from "./actions";
import {
  aprovarPerfilInputSchema,
  vincularServidorInputSchema,
  type AprovarPerfilInput,
  type VincularServidorInput,
} from "./schemas";

// Sentinela para o Select representar "sem núcleo" (Radix Select não aceita "").
const NUCLEO_NONE = "__none__";

interface PerfilBrief {
  id: string;
  nome: string;
  cargo: string | null;
  servidorId: string | null;
}

interface Nucleo {
  id: string;
  nome: string;
}

interface Props {
  perfil: PerfilBrief;
  variant: "pendente" | "ativo" | "admin";
  nucleosDisponiveis: Nucleo[];
}

export function PerfilActions({ perfil, variant, nucleosDisponiveis }: Props) {
  const [isPending, startTransition] = useTransition();

  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [vincularOpen, setVincularOpen] = useState(false);

  const [confirmKind, setConfirmKind] = useState<
    "recusar" | "revogar" | "rebaixar" | null
  >(null);
  const confirmOpen = confirmKind !== null;

  function handlePromover() {
    startTransition(async () => {
      const res = await promoverAdminAction(perfil.id);
      if (res.ok) toast.success(`${perfil.nome} promovido(a) a admin.`);
      else toast.error(res.error);
    });
  }

  function handleConfirmar() {
    if (!confirmKind) return;
    const kind = confirmKind;
    startTransition(async () => {
      const res =
        kind === "recusar"
          ? await recusarPerfilAction(perfil.id)
          : kind === "revogar"
            ? await revogarPerfilAction(perfil.id)
            : await rebaixarAdminAction(perfil.id);

      if (res.ok) {
        toast.success(
          kind === "recusar"
            ? `Cadastro de ${perfil.nome} recusado.`
            : kind === "revogar"
              ? `Acesso de ${perfil.nome} revogado.`
              : `${perfil.nome} rebaixado(a) a servidor.`,
        );
      } else {
        toast.error(res.error);
      }
      setConfirmKind(null);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {variant === "pendente" && (
        <>
          <Button
            size="sm"
            onClick={() => setAprovarOpen(true)}
            disabled={isPending}
          >
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirmKind("recusar")}
          >
            Recusar
          </Button>
        </>
      )}

      {variant === "ativo" && (
        <>
          {!perfil.servidorId && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setVincularOpen(true)}
            >
              Criar servidor
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={handlePromover}
          >
            Promover a admin
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirmKind("revogar")}
          >
            Revogar
          </Button>
        </>
      )}

      {variant === "admin" && (
        <>
          {!perfil.servidorId && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setVincularOpen(true)}
            >
              Criar servidor
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirmKind("rebaixar")}
          >
            Rebaixar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirmKind("revogar")}
          >
            Revogar
          </Button>
        </>
      )}

      <AprovarDialog
        open={aprovarOpen}
        onOpenChange={setAprovarOpen}
        perfil={perfil}
        nucleosDisponiveis={nucleosDisponiveis}
      />
      <VincularDialog
        open={vincularOpen}
        onOpenChange={setVincularOpen}
        perfil={perfil}
        nucleosDisponiveis={nucleosDisponiveis}
      />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(o) => !o && setConfirmKind(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmKind === "recusar"
                ? "Recusar cadastro?"
                : confirmKind === "revogar"
                  ? "Revogar acesso?"
                  : "Rebaixar a servidor?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKind === "recusar" ? (
                <>
                  A conta de <strong>{perfil.nome}</strong> será removida
                  definitivamente do sistema. A pessoa pode se cadastrar de novo
                  se quiser.
                </>
              ) : confirmKind === "revogar" ? (
                <>
                  <strong>{perfil.nome}</strong> perde o acesso imediatamente e
                  volta para a fila de pendentes. Você pode aprovar de novo depois.
                </>
              ) : (
                <>
                  <strong>{perfil.nome}</strong> deixa de ser admin e vira
                  servidor comum. Você continua sendo admin.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmar();
              }}
              disabled={isPending}
              className="bg-[var(--danger)] text-white hover:opacity-90"
            >
              {isPending ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AprovarDialog({
  open,
  onOpenChange,
  perfil,
  nucleosDisponiveis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfil: PerfilBrief;
  nucleosDisponiveis: Nucleo[];
}) {
  const [isPending, startTransition] = useTransition();

  const defaultValues = useMemo<AprovarPerfilInput>(
    () => ({
      perfilId: perfil.id,
      role: "servidor",
      apelido: "",
      cargo: perfil.cargo ?? "",
      tipoVinculo: "Efetivo",
      dataIngresso: new Date().toISOString().slice(0, 10),
      nucleoId: null,
    }),
    [perfil.id, perfil.cargo],
  );

  const form = useForm<AprovarPerfilInput>({
    resolver: zodResolver(aprovarPerfilInputSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  function onSubmit(values: AprovarPerfilInput) {
    startTransition(async () => {
      const res = await aprovarPerfilAction(values);
      if (res.ok) {
        toast.success(`${perfil.nome} aprovado(a) e adicionado(a) ao catálogo.`);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprovar {perfil.nome}</DialogTitle>
          <DialogDescription>
            Definir o nível de acesso e criar a entrada no catálogo de
            servidores. Nome, e-mail e matrícula vêm do cadastro.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field label="Nível de acesso" error={errors.role?.message}>
            <Select
              value={form.watch("role")}
              onValueChange={(v) =>
                form.setValue("role", v as AprovarPerfilInput["role"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="servidor">Servidor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Apelido" error={errors.apelido?.message}>
            <Input
              {...form.register("apelido")}
              placeholder="Ex.: Marco, Tereza"
            />
          </Field>

          <Field
            label="Cargo"
            error={errors.cargo?.message}
            className="sm:col-span-2"
          >
            <Input {...form.register("cargo")} placeholder="Ex.: Analista Ambiental" />
          </Field>

          <Field label="Tipo de vínculo" error={errors.tipoVinculo?.message}>
            <Select
              value={form.watch("tipoVinculo")}
              onValueChange={(v) =>
                form.setValue(
                  "tipoVinculo",
                  v as AprovarPerfilInput["tipoVinculo"],
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_VINCULO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Data de ingresso"
            error={errors.dataIngresso?.message}
          >
            <Input type="date" {...form.register("dataIngresso")} />
          </Field>

          <Field
            label="Núcleo principal (opcional)"
            error={errors.nucleoId?.message}
            className="sm:col-span-2"
          >
            <Select
              value={form.watch("nucleoId") ?? NUCLEO_NONE}
              onValueChange={(v) =>
                form.setValue("nucleoId", v === NUCLEO_NONE ? null : v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    nucleosDisponiveis.length === 0
                      ? "Nenhum núcleo cadastrado — configure em /nucleos primeiro"
                      : "Selecione..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NUCLEO_NONE}>Sem núcleo por enquanto</SelectItem>
                {nucleosDisponiveis.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isPending ? "Aprovando..." : "Aprovar e cadastrar servidor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VincularDialog({
  open,
  onOpenChange,
  perfil,
  nucleosDisponiveis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perfil: PerfilBrief;
  nucleosDisponiveis: Nucleo[];
}) {
  const [isPending, startTransition] = useTransition();

  const defaultValues = useMemo<VincularServidorInput>(
    () => ({
      perfilId: perfil.id,
      apelido: "",
      cargo: perfil.cargo ?? "",
      tipoVinculo: "Efetivo",
      dataIngresso: new Date().toISOString().slice(0, 10),
      nucleoId: null,
    }),
    [perfil.id, perfil.cargo],
  );

  const form = useForm<VincularServidorInput>({
    resolver: zodResolver(vincularServidorInputSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  function onSubmit(values: VincularServidorInput) {
    startTransition(async () => {
      const res = await vincularServidorAction(values);
      if (res.ok) {
        toast.success(`${perfil.nome} adicionado(a) ao catálogo.`);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar servidor para {perfil.nome}</DialogTitle>
          <DialogDescription>
            Este perfil está aprovado mas ainda não tem uma entrada em
            Servidores. Preencha os campos abaixo para materializar a pessoa
            no catálogo operacional.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Field
            label="Apelido"
            error={errors.apelido?.message}
            className="sm:col-span-2"
          >
            <Input
              {...form.register("apelido")}
              placeholder="Ex.: Marco, Tereza"
            />
          </Field>

          <Field
            label="Cargo"
            error={errors.cargo?.message}
            className="sm:col-span-2"
          >
            <Input {...form.register("cargo")} placeholder="Ex.: Analista Ambiental" />
          </Field>

          <Field label="Tipo de vínculo" error={errors.tipoVinculo?.message}>
            <Select
              value={form.watch("tipoVinculo")}
              onValueChange={(v) =>
                form.setValue(
                  "tipoVinculo",
                  v as VincularServidorInput["tipoVinculo"],
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_VINCULO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Data de ingresso"
            error={errors.dataIngresso?.message}
          >
            <Input type="date" {...form.register("dataIngresso")} />
          </Field>

          <Field
            label="Núcleo principal (opcional)"
            error={errors.nucleoId?.message}
            className="sm:col-span-2"
          >
            <Select
              value={form.watch("nucleoId") ?? NUCLEO_NONE}
              onValueChange={(v) =>
                form.setValue("nucleoId", v === NUCLEO_NONE ? null : v, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    nucleosDisponiveis.length === 0
                      ? "Nenhum núcleo cadastrado — configure em /nucleos primeiro"
                      : "Selecione..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NUCLEO_NONE}>Sem núcleo por enquanto</SelectItem>
                {nucleosDisponiveis.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isPending ? "Criando..." : "Criar servidor"}
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
