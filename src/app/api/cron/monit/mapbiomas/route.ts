/**
 * Cron mensal (dia 6, 04h UTC) — sincroniza dados MapBiomas do upstream.
 * Ver `vercel.json` para agendamento. Gate por CRON_SECRET.
 */
import { runCronSync } from "@/lib/monit-ext/cron-handler";
import { syncMapbiomas } from "@/lib/monit-ext/mapbiomas-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runCronSync(request, "mapbiomas", syncMapbiomas);
}
export async function POST(request: Request) {
  return runCronSync(request, "mapbiomas", syncMapbiomas);
}
