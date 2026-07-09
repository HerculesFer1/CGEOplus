import { NextRequest } from "next/server";
import { gerarRelatorio } from "@/lib/monitoramento/relatorio";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sigla = request.nextUrl.searchParams.get("programa");
  if (!sigla) {
    return new Response("programa obrigatório", { status: 400 });
  }

  try {
    const { buffer, filename } = await gerarRelatorio(sigla);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    return new Response(`Falha ao gerar relatório: ${msg}`, { status: 500 });
  }
}
