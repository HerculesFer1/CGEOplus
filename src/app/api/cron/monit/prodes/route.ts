/**
 * Cron anual (2 de outubro, 04h UTC) — sincroniza ciclo PRODES do upstream.
 * Ver `vercel.json` para agendamento. Gate por CRON_SECRET.
 */
import { runCronSync } from "@/lib/monit-ext/cron-handler";
import { syncProdes } from "@/lib/monit-ext/prodes-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runCronSync(request, "prodes", syncProdes);
}
export async function POST(request: Request) {
  return runCronSync(request, "prodes", syncProdes);
}
