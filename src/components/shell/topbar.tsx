import { Search, Command } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/shell/user-menu";
import {
  NotificationsBell,
  type LembreteChip,
} from "@/components/shell/notifications-bell";
import { PresentationButton } from "@/components/shell/presentation-button";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  eventosService,
  formatarAntecedencia,
} from "@/lib/services/eventos.service";

export async function Topbar() {
  // Carrega lembretes ativos e o usuário em paralelo. O sino usa os mesmos
  // dados que a futura tela pós-login vai consumir (project_post_login_home).
  const [user, ativos] = await Promise.all([
    getCurrentProfile(),
    eventosService.listLembretesAtivos().catch(() => []),
  ]);

  const lembretes: LembreteChip[] = ativos.map((a) => ({
    eventoId: a.evento.id,
    titulo: a.evento.titulo,
    local: a.evento.local,
    tipo: a.evento.tipo,
    inicioIso: a.evento.inicio.toISOString(),
    antecedenciaLabel: formatarAntecedencia(a.minutosAteEvento),
  }));

  return (
    <header
      className={
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-[var(--bg)]/80 px-4 backdrop-blur-xl lg:px-8"
      }
    >
      <div className="lg:hidden">
        <Logo size={18} />
      </div>

      <button
        type="button"
        className="ml-auto inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-full border bg-[var(--surface)] px-4 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        aria-label="Abrir busca"
      >
        <Search className="h-4 w-4" strokeWidth={1.75} />
        <span className="flex-1 text-left">Buscar processo, servidor…</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border bg-[var(--elevated)] px-1.5 py-0.5 font-mono text-[10px]">
          <Command className="h-3 w-3" strokeWidth={2} />K
        </kbd>
      </button>

      <NotificationsBell lembretes={lembretes} />
      <PresentationButton />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
