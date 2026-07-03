/**
 * Seed inicial do CGEO+.
 * Cria núcleos, atividades base e os 13 servidores identificados no relatório
 * (Maio/2026) + Dalila (ingresso Jul/2026).
 *
 * Rode com: npx tsx src/lib/db/seed.ts
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { db } from "./client";
import {
  nucleos,
  servidores,
  servidorNucleo,
  atividades,
} from "./schema";

const NUCLEOS_SEED = [
  { nome: "Coordenacao", descricao: "Coordenação geral do CGEO", corTema: "#0071E3", minMembros: 1 },
  { nome: "Licenciamento", descricao: "Licenciamento Ambiental/Florestal", corTema: "#30D158", minMembros: 3 },
  { nome: "CAR", descricao: "Cadastro Ambiental Rural", corTema: "#FF9F0A", minMembros: 3 },
  { nome: "Fiscalizacao", descricao: "Fiscalização ambiental", corTema: "#FF453A", minMembros: 2 },
  { nome: "Administrativo", descricao: "Suporte administrativo", corTema: "#8E8E93", minMembros: 1 },
];

const SERVIDORES_SEED = [
  { nome: "Aline Lima",       apelido: "Aline",    email: "aline@semarh.gov.br",     cargo: "Auditora Fiscal Ambiental / Gestora",         tipoVinculo: "Efetivo",   dataIngresso: "2025-06-01", nucleoPrincipal: "Coordenacao" },
  { nome: "Allan Pitterson",  apelido: "Allan",    email: "allan@semarh.gov.br",     cargo: "Tecnólogo/Analista de Geoprocessamento",       tipoVinculo: "Efetivo",   dataIngresso: "2023-10-01", nucleoPrincipal: "Licenciamento" },
  { nome: "Davi Monteiro",    apelido: "Davi",     email: "davi@semarh.gov.br",      cargo: "Consultor Pilares/Esp. Geoprocessamento",      tipoVinculo: "Consultor", dataIngresso: "2023-09-01", nucleoPrincipal: "Licenciamento" },
  { nome: "Emilio Daniel",    apelido: "Emílio",   email: "emilio@semarh.gov.br",    cargo: "Tecnólogo/Analista de Geoprocessamento",       tipoVinculo: "Efetivo",   dataIngresso: "2024-11-01", nucleoPrincipal: "Licenciamento" },
  { nome: "Hercules Maciel",  apelido: "Hércules", email: "hercules@semarh.gov.br",  cargo: "Consultor Pilares/Esp. Geoprocessamento",      tipoVinculo: "Consultor", dataIngresso: "2026-03-01", nucleoPrincipal: "Licenciamento" },
  { nome: "Italo Phelipe",    apelido: "Italo",    email: "italo@semarh.gov.br",     cargo: "Consultor Pilares/Esp. Geoprocessamento",      tipoVinculo: "Consultor", dataIngresso: "2019-07-01", nucleoPrincipal: "Licenciamento" },
  { nome: "Jose Eudes",       apelido: "Eudes",    email: "eudes@semarh.gov.br",     cargo: "Consultor PSI/Esp. Eng. Agronômica",           tipoVinculo: "Consultor", dataIngresso: "2025-11-01", nucleoPrincipal: "CAR" },
  { nome: "Marco Aurelio",    apelido: "Marco",    email: "marco@semarh.gov.br",     cargo: "Consultor PSI/Esp. Geoprocessamento",          tipoVinculo: "Consultor", dataIngresso: "2015-09-01", nucleoPrincipal: "CAR" },
  { nome: "Maria Tereza",     apelido: "Tereza",   email: "tereza@semarh.gov.br",    cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor", dataIngresso: "2016-10-01", nucleoPrincipal: "CAR" },
  { nome: "Milena Kamila",    apelido: "Kamila",   email: "kamila@semarh.gov.br",    cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor", dataIngresso: "2023-09-01", nucleoPrincipal: "Fiscalizacao" },
  { nome: "Natanael de Araujo", apelido: "Natanael", email: "natanael@semarh.gov.br", cargo: "Consultor PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor", dataIngresso: "2016-10-01", nucleoPrincipal: "Fiscalizacao" },
  { nome: "Raylane Rodrigues", apelido: "Raylane", email: "raylane@semarh.gov.br",   cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor", dataIngresso: "2023-11-01", nucleoPrincipal: "CAR" },
  { nome: "Suyanny Soleani",  apelido: "Suyanny",  email: "suyanny@semarh.gov.br",   cargo: "Auxiliar Administrativa",                       tipoVinculo: "Suporte",   dataIngresso: "2024-01-01", nucleoPrincipal: "Administrativo" },
  // Ingresso posterior identificado na planilha (Jul/2026)
  { nome: "Dalila",           apelido: "Dalila",   email: "dalila@semarh.gov.br",    cargo: "Consultora PSI/Esp. Geoprocessamento",         tipoVinculo: "Consultor", dataIngresso: "2026-07-01", nucleoPrincipal: "CAR" },
] as const;

async function main() {
  console.log("→ Seeding núcleos...");
  const insertedNucleos = await db
    .insert(nucleos)
    .values(NUCLEOS_SEED)
    .returning();
  const nucleoByName = Object.fromEntries(
    insertedNucleos.map((n) => [n.nome, n.id]),
  );

  console.log("→ Seeding servidores + vínculos principais...");
  for (const s of SERVIDORES_SEED) {
    const [inserted] = await db
      .insert(servidores)
      .values({
        nome: s.nome,
        apelido: s.apelido,
        email: s.email,
        cargo: s.cargo,
        tipoVinculo: s.tipoVinculo,
        dataIngresso: s.dataIngresso,
      })
      .returning();

    await db.insert(servidorNucleo).values({
      servidorId: inserted.id,
      nucleoId: nucleoByName[s.nucleoPrincipal]!,
      isPrincipal: true,
      dataInicio: s.dataIngresso,
    });
  }

  console.log("→ Seeding atividades base (exemplos)...");
  await db.insert(atividades).values([
    { nome: "Análise de licenciamento ambiental", complexidade: "N3", nucleoId: nucleoByName["Licenciamento"] },
    { nome: "Autorização de supressão vegetal", complexidade: "N3", nucleoId: nucleoByName["Licenciamento"] },
    { nome: "Lançamento CAR", complexidade: "N1", nucleoId: nucleoByName["CAR"] },
    { nome: "Análise CAR", complexidade: "N2", nucleoId: nucleoByName["CAR"] },
    { nome: "Mapeamento CAR", complexidade: "N2", nucleoId: nucleoByName["CAR"] },
    { nome: "Fiscalização de embargo", complexidade: "N3", nucleoId: nucleoByName["Fiscalizacao"] },
    { nome: "Consulta de acesso a dados", complexidade: "N1", nucleoId: nucleoByName["Administrativo"] },
  ]);

  console.log("✓ Seed concluído.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Erro no seed:", err);
  process.exit(1);
});
