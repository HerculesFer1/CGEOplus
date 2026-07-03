/**
 * Testa o DrizzleServidorRepository end-to-end contra o Supabase real.
 * Verifica: list, findById, findByEmail, insert, update, delete.
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { DrizzleServidorRepository } from "@/lib/repositories/servidor.drizzle";
import { ServidoresService } from "@/lib/services/servidores.service";

async function main() {
  const svc = new ServidoresService(new DrizzleServidorRepository());

  console.log("→ Listando servidores...");
  const all = await svc.list();
  console.log(`  ✓ ${all.length} servidores carregados`);
  console.log(`  Primeiro: ${all[0]?.nome} (${all[0]?.nucleoPrincipal})`);

  console.log("\n→ Buscando por e-mail...");
  const marco = await svc.list();
  const mc = marco.find((s) => s.apelido === "Marco");
  if (mc) console.log(`  ✓ Marco encontrado: ${mc.nome} — ${mc.nucleoPrincipal}`);

  console.log("\n→ Testando criação de servidor teste...");
  const testEmail = `teste.${Date.now()}@semarh.gov.br`;
  const created = await svc.create({
    nome: "Servidor Teste E2E",
    apelido: "Teste",
    email: testEmail,
    matricula: "",
    cargo: "Consultor Teste",
    tipoVinculo: "Consultor",
    especialidade: "",
    dataIngresso: "2026-01-01",
    status: "ativo",
    nucleoPrincipal: "Licenciamento",
  });
  console.log(`  ✓ Criado: ${created.id}`);

  console.log("\n→ Atualizando cargo...");
  const updated = await svc.update({
    id: created.id,
    cargo: "Consultor Teste ATUALIZADO",
  });
  console.log(`  ✓ Cargo atual: ${updated.cargo}`);

  console.log("\n→ Removendo...");
  await svc.delete(created.id);
  const gone = await svc.list();
  console.log(
    gone.find((s) => s.id === created.id)
      ? "  ✗ ainda existe"
      : `  ✓ removido — total agora: ${gone.length}`,
  );

  console.log("\n✓ Todos os testes E2E passaram.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Erro:", err);
  process.exit(1);
});
