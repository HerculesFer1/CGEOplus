# PRODES Cerrado

> **Última revisão:** 2026-07-17 · **Ambiente:** `/monitoramento/prodes` · **Cadência:** anual (2 de outubro)

## O que é

O **PRODES** é o monitoramento oficial de desmatamento do INPE, publicado **uma vez
por ano**. No CGEO+ ele serve para uma coisa específica: **validar** os alertas do
MapBiomas. A pergunta que este ambiente responde é *"o que o MapBiomas detectou, o
PRODES confirma?"*.

## Os números que aparecem no painel

| Termo | O que significa |
|---|---|
| **Concordante** | Alerta MapBiomas **confirmado** pelo polígono PRODES no mesmo ano |
| **Discordante** | MapBiomas detectou, mas o PRODES **não** confirmou (provável falso positivo) |
| **Sem PRODES** | Ainda não coberto pelo ciclo anual (o PRODES sai só em outubro) |
| **Concordância (%)** | `concordantes ÷ total × 100` |
| **Cobertura média** | Quanto do polígono de alerta o PRODES efetivamente confirmou |

Quanto **maior a concordância**, mais alinhados estão MapBiomas e PRODES. A série do
Piauí vem subindo (60,7% → 76,2% de 2022 a 2025), o que indica bases cada vez mais
consistentes entre si.

## Vetor de pressão e cobertura

- **Vetor de pressão:** de onde vem a conversão do Cerrado — agricultura (dominante),
  expansão urbana, mineração, etc.
- **Distribuição de cobertura:** quantos alertas caem em cada faixa de sobreposição
  (`0%`, `1-24%`, … `90-100%`). A faixa **0%** concentra os discordantes; a faixa
  **90-100%** é dupla confirmação forte — prioritária para autuação.

> Vetor de pressão e distribuição de cobertura são **acumulados de todos os ciclos** —
> a base upstream não tem recorte por ano nessas duas visões, então elas não mudam com
> o seletor de ano.

## Filtro "Todos os anos" (modo agregado)

Ao escolher **Todos os anos**, o **mapa** e o **ranking** de municípios somam a área
validada e detectada de **todos os ciclos** por município (concordância recalculada
sobre os totais), em vez de empilhar as linhas ano a ano. Em um ano específico, mostram
só os municípios daquele ciclo.

## Ciclo em aberto (ano corrente)

O ciclo do ano corrente pode existir com **total zero** até o PRODES publicar (em
outubro). O painel **exclui automaticamente** esse ciclo em aberto dos gráficos e dos
totalizadores — ele nunca conta um ciclo vazio como se fosse discordância. Você verá
a tarja **"Ciclo em aberto — PRODES publica em outubro"** quando isso acontecer.

## Como o PRODES entra no IPA

A **divergência PRODES** (`100 − concordância`) entra com **peso 20%** no [IPA](ipa) —
é a "pressão de incerteza": quanto mais as duas bases discordam num município, mais
esse município sobe no índice.

## Fonte

- **Fonte:** bloco `prodesSummary` + `prodesExtra` do `resumo_estatico.json` upstream.
- Atualização automática — ver [Atualização automática](atualizacao-automatica).
