import { asc, desc, eq } from "drizzle-orm";
import { ShieldCheck, UserCheck, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db/client";
import { nucleos, profiles } from "@/lib/db/schema";

import { PerfilActions } from "./perfil-actions";

export const dynamic = "force-dynamic";

export default async function AprovacoesPage() {
  const [todos, nucleosDisponiveis] = await Promise.all([
    db.select().from(profiles).orderBy(desc(profiles.createdAt)),
    db
      .select({ id: nucleos.id, nome: nucleos.nome })
      .from(nucleos)
      .where(eq(nucleos.ativo, true))
      .orderBy(asc(nucleos.nome)),
  ]);

  const pendentes = todos.filter((p) => !p.approved);
  const ativos = todos.filter((p) => p.approved && p.role === "servidor");
  const admins = todos.filter((p) => p.approved && p.role === "admin");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Aprovações</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Aprove ou recuse solicitações de acesso, defina o nível e vincule ao
          catálogo operacional de servidores.
        </p>
      </header>

      <Section
        icon={<UserCheck className="h-4 w-4" />}
        title="Pendentes"
        count={pendentes.length}
        empty="Nenhuma solicitação aguardando aprovação."
      >
        {pendentes.length > 0 && (
          <PerfilTable
            perfis={pendentes}
            variant="pendente"
            nucleosDisponiveis={nucleosDisponiveis}
          />
        )}
      </Section>

      <Section
        icon={<Users2 className="h-4 w-4" />}
        title="Servidores ativos"
        count={ativos.length}
        empty="Nenhum servidor com acesso ativo."
      >
        {ativos.length > 0 && (
          <PerfilTable
            perfis={ativos}
            variant="ativo"
            nucleosDisponiveis={nucleosDisponiveis}
          />
        )}
      </Section>

      <Section
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Administradores"
        count={admins.length}
        empty="Nenhum administrador cadastrado."
      >
        {admins.length > 0 && (
          <PerfilTable
            perfis={admins}
            variant="admin"
            nucleosDisponiveis={nucleosDisponiveis}
          />
        )}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </h2>
        <Badge variant="outline">{count}</Badge>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          {empty}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

interface Nucleo {
  id: string;
  nome: string;
}

interface Perfil {
  id: string;
  email: string;
  nome: string;
  matricula: string | null;
  cargo: string | null;
  role: "admin" | "servidor";
  createdAt: Date;
  approvedAt: Date | null;
  servidorId: string | null;
}

function PerfilTable({
  perfis,
  variant,
  nucleosDisponiveis,
}: {
  perfis: Perfil[];
  variant: "pendente" | "ativo" | "admin";
  nucleosDisponiveis: Nucleo[];
}) {
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead>Matrícula</TableHead>
          <TableHead>Vínculo</TableHead>
          <TableHead>
            {variant === "pendente" ? "Solicitado em" : "Aprovado em"}
          </TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {perfis.length === 0 ? (
          <TableRow>
            <TableEmpty colSpan={7}>Vazio.</TableEmpty>
          </TableRow>
        ) : (
          perfis.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-[var(--text)]">
                {p.nome}
              </TableCell>
              <TableCell className="text-[var(--text-muted)]">
                {p.email}
              </TableCell>
              <TableCell className="text-[var(--text-muted)]">
                {p.cargo ?? "—"}
              </TableCell>
              <TableCell className="text-[var(--text-muted)]">
                {p.matricula ?? "—"}
              </TableCell>
              <TableCell>
                {p.servidorId ? (
                  <Badge variant="success">Servidor</Badge>
                ) : variant === "pendente" ? (
                  <span className="text-xs text-[var(--text-subtle)]">—</span>
                ) : (
                  <Badge variant="warning">Sem servidor</Badge>
                )}
              </TableCell>
              <TableCell className="text-[var(--text-muted)]">
                {dateFormatter.format(
                  variant === "pendente" ? p.createdAt : (p.approvedAt ?? p.createdAt),
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <PerfilActions
                    perfil={{
                      id: p.id,
                      nome: p.nome,
                      cargo: p.cargo,
                      servidorId: p.servidorId,
                    }}
                    variant={variant}
                    nucleosDisponiveis={nucleosDisponiveis}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
