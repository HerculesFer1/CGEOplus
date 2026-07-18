# Queimadas

> **Última revisão:** 2026-07-17 · **Ambiente:** `/monitoramento/queimadas` · **Cadência:** mensal (dia 15)

## O que é

Este ambiente mede **área queimada** no Piauí usando o produto **AQ1km V6 (Coleção 2)**
do INPE/LASA-UFRJ, e cruza cada cicatriz de queimada com **zonas de prioridade
ambiental** para destacar o fogo onde ele mais importa.

## Conceitos-chave

| Termo | O que significa |
|---|---|
| **Cicatriz** | Polígono de área queimada detectado (≠ "foco de calor") |
| **Área queimada (ha)** | Hectares queimados no período |
| **Classe AHP (1-5)** | Prioridade ambiental do território: 1 muito baixa … 5 muito alta |
| **% em prioritária** | Fração da área queimada dentro de zona de alta prioridade |
| **Em alerta CGEO+** | Critério de triagem — ver abaixo |

**AHP** (*Analytic Hierarchy Process*) é o método que ordena o território em 5 classes
de prioridade para conservação. Fogo nas classes **4 e 5** pressiona diretamente as
áreas que a política pública quer proteger.

## Critério "Em alerta CGEO+"

Um município entra em **alerta CGEO+** quando as duas condições valem ao mesmo tempo:

1. **Classe AHP máxima ≥ 4** (Alta ou Muito Alta prioridade), **e**
2. **Mais de 50%** da área queimada dentro de zona prioritária.

> Esse critério é calculado **no próprio banco** (coluna gerada `em_alerta`), então o
> KPI, o mapa e o ranking usam exatamente a mesma definição — não há divergência entre
> eles. É o filtro que aciona a triagem de campo.

O fogo em áreas prioritárias entra com **peso 30%** no [IPA](ipa).

## A faixa "Não classificada" (por que ela existe)

No gráfico **"Por classe AHP"** você verá, além das 5 classes, uma faixa cinza
**"Não classificada"**. Motivo: a tabela de cruzamento por classe cobre **só** a área
que caiu dentro de alguma zona classificada por AHP — a área queimada fora dessas
zonas não aparece nas classes 1-5. Sem a faixa residual, a soma das classes ficaria
**menor** que o total do estado (o que dava impressão de subnotificação).

A faixa "Não classificada" = **total do ano (KPI) − soma das classes**. Assim o gráfico
**fecha** com o KPI do topo. O número autoritativo de área queimada continua sendo
sempre o **KPI** e o **mapa municipal**.

> **Nota técnica (2026-07):** a ingestão agora **soma** linhas duplicadas do upstream
> na chave `(município, ano, mês, classe)` em vez de sobrescrevê-las — isso corrigiu
> uma perda de ~3-7% que existia nos gráficos por classe. A correção passa a valer a
> partir do próximo sync.

## Filtro "Todos os anos" (modo agregado)

Ao escolher **Todos os anos**, o **mapa** e o **ranking** municipal passam a somar a
área queimada de toda a série por município (classe AHP máxima do período, % em área
prioritária como média ponderada pela área). Antes esses dois caíam no **último ano**,
destoando do KPI "Área queimada", que já somava a série. O banner de alerta, o gráfico
por classe e o IPA seguem sendo a leitura do ano mais recente com dados (são recortes
datados).

## Limitações importantes (do produto INPE)

- **Produto provisório** — estimativa exploratória, não base para autuação.
- **Superestimação de área** — resolução de 1 km; pixels com fogo parcial contam
  inteiros.
- **Cicatrizes ≠ focos** — um evento pode gerar vários polígonos.
- **Nuvens** — Jan-Mar no Piauí tem alta nebulosidade e pode subestimar cicatrizes.

## Fonte

- **Fonte:** tabelas `qb_*` do banco de apoio upstream (execuções, resumo municipal e
  granular por mês × classe).
- Atualização automática — ver [Atualização automática](atualizacao-automatica).
