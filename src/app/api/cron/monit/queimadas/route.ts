/**
 * Cron mensal (dia 15, 04h UTC) — sincroniza queimadas BDQ-INPE do upstream.
 * Ver `vercel.json` para agendamento. Gate por CRON_SECRET.
 * Job maior (19k registros por sync) — maxDuration 5 min.
 */
import { runCronSync } from "@/lib/monit-ext/cron-handler";
import { syncQueimadas } from "@/lib/monit-ext/queimadas-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return runCronSync(request, "queimadas", syncQueimadas);
}
export async function POST(request: Request) {
  return runCronSync(request, "queimadas", syncQueimadas);
}
