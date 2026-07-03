/**
 * Usuários de teste — modo desenvolvimento.
 *
 * ⚠️ Remover este arquivo (e as rotas relacionadas) quando Google OAuth
 *    estiver configurado no Supabase (docs/supabase-setup.md §5).
 */

export type TestRole = "admin" | "coordenador" | "analista" | "visualizacao";

export interface TestUser {
  id: string;
  nome: string;
  email: string;
  papel: TestRole;
  descricao: string;
  cor: string;
}

export const TEST_USERS: TestUser[] = [
  {
    id: "test-admin-001",
    nome: "Administrador de Teste",
    email: "admin@cgeo-plus.dev",
    papel: "admin",
    descricao: "Acesso total: cadastros, dashboards, exportação, importação.",
    cor: "#0071E3",
  },
  {
    id: "test-coord-001",
    nome: "Aline Lima (Coordenação)",
    email: "aline@semarh.gov.br",
    papel: "coordenador",
    descricao: "Perfil da gestora: visão geral, cadastros, aprovações.",
    cor: "#30D158",
  },
  {
    id: "test-analista-001",
    nome: "Marco Aurelio (Analista)",
    email: "marco@semarh.gov.br",
    papel: "analista",
    descricao: "Analista de núcleo: registra suas análises, vê própria produtividade.",
    cor: "#FF9F0A",
  },
  {
    id: "test-view-001",
    nome: "Somente Visualização",
    email: "view@cgeo-plus.dev",
    papel: "visualizacao",
    descricao: "Consulta dashboards e listas — não altera dados.",
    cor: "#8E8E93",
  },
];

export function findTestUser(id: string): TestUser | undefined {
  return TEST_USERS.find((u) => u.id === id);
}
