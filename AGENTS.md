<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Documentação de metodologia (`/docs`) — regra de sincronia

O ambiente `/docs` explica, em linguagem simples, a metodologia de cada módulo. A
fonte da verdade é `docs/metodologia/*.md` + o índice `src/lib/docs/metodologia.ts`,
renderizados pela rota `src/app/docs/`.

**Sempre que uma mudança alterar o método de um ambiente, atualize a documentação na
mesma entrega:**

- Mudou uma fórmula, critério, cadência de sync ou fonte de dados de um módulo →
  atualize o `.md` correspondente e o seu cabeçalho `> Última revisão: AAAA-MM-DD`.
- Novo ambiente/módulo → crie `docs/metodologia/NN-<slug>.md` **e** adicione a entrada
  em `DOCS_METODOLOGIA` (`src/lib/docs/metodologia.ts`).
- Mudou o IPA (pesos/composição em `IPA_PESOS`) → atualize `04-ipa.md`.

Tratar a doc desatualizada como bug: se o código e o `.md` divergem, um dos dois está errado.
