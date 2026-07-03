# De-Para: Planilha `PROCESSOS_CONTABILIZAR_[2026].xlsx` → CGEO+

Documento de mapeamento fiel entre as colunas da planilha atual e o modelo de dados do sistema.

## Estrutura original

Cada aba (JANEIRO, FEVEREIRO, ..., DEZEMBRO, PAINEL, GRÁFICOS) tem as mesmas 7 colunas úteis:

| Coluna | Tipo | Exemplo |
|---|---|---|
| DIA | Data | 2026-05-04 |
| SISTEMA | Texto | SEI · SIGA · SICAR-LANÇAMENTO · SICAR-ANALISE |
| PROCESSO | Texto | `CCAR.13427-9/2025` · `PI-2210656-96E69...` · `00130.008773/2025-15` |
| ANALISTA | Texto | Raylane · Italo · Marco · Kamila · ... |
| STATUS | Texto | Finalizado · Analisado com pendência · Indeferido · Desarquivado |
| SETOR DE DESTINO | Texto | Concluído no setor · CGEO · FLORESTA · Licenciamento · SICAR |
| OBS | Texto livre | (opcional) |

## Mapeamento para o schema

Cada linha da planilha → 1 registro em `analises` + 1 registro em `processos` (ou reuso se o processo já existe).

| Coluna planilha | Tabela · Campo | Notas |
|---|---|---|
| DIA | `analises.data_analise` | Date |
| SISTEMA (parte antes do "-") | `processos.sistema` | Enum: SEI / SIGA / SICAR |
| SISTEMA (parte após "SICAR-") | `processos.sicar_finalidade` | Lançamento → `Lancamento`, ANALISE → `Analise`, MAPEAMENTO → `Mapeamento` |
| PROCESSO | `processos.numero` | Normalização: trim + upper |
| ANALISTA | `analises.servidor_id` | Lookup por `servidores.apelido` |
| STATUS | `analises.resultado` | Enum: Finalizado / Analisado com pendencia / Indeferido / Desarquivado |
| SETOR DE DESTINO | `analises.setor_destino` | Enum: Concluido no setor / CGEO / FLORESTA / Licenciamento / SICAR |
| OBS | `analises.observacoes` | Texto livre |

## Regras de deduplicação

Ao importar:

1. Cada `(numero, sistema)` é único em `processos`.
2. Se já existe → apenas nova linha em `analises` (com `numero_ordem` incrementado).
3. Se não existe → cria em `processos` + primeira linha em `analises`.

Isso preserva a realidade de reanálises: um mesmo processo pode aparecer múltiplas vezes na planilha (mesmo analista ou diferentes), e o sistema mantém o histórico completo.

## Casos observados

- **Volume**: ~965–2576 linhas/mês por aba (Janeiro é atípica com 2576).
- **Meses futuros vazios**: abas AGOSTO–DEZEMBRO já têm cabeçalho mas sem dados → o importador ignora linhas com `DIA IS NULL`.
- **Analistas informais**: nomes na planilha usam apenas o primeiro nome ou nickname (Marco, Tereza, Italo, Kamila, Emílio, Raylane, Davi, Allan, Natanael, Hércules, Eudes, Dalila). O campo `servidores.apelido` cobre esse casamento.
- **Nova analista**: "Dalila" (a partir de Jul/2026) não constava no relatório setorial de Maio/2026 → adicionada no seed.
- **PAINEL**: já é uma agregação por analista × status. Usaremos como *fixture* para validar os dashboards nossos.

## Wizard de import (V2)

O sistema terá um wizard dedicado:

1. Upload de XLSX/CSV
2. Preview das primeiras 50 linhas com validação por célula
3. Dry-run: relatório de "N linhas OK, M linhas com aviso, K erros"
4. Confirmar → commit em transação
5. Erros exportados em CSV para correção manual
