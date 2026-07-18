# MapBiomas Alerta

> **Última revisão:** 2026-07-17 · **Ambiente:** `/monitoramento/mapbiomas` · **Cadência:** mensal (dia 6) · **Fonte da série anual:** RPC ao vivo `get_resumo_anual`

## O que é

O **MapBiomas Alerta** detecta, por satélite, **onde houve desmatamento** e cruza cada
alerta com bases fundiárias e de autorização para dizer se aquele desmatamento **tinha
ou não autorização**. O CGEO+ recorta esses alertas para o Piauí.

## Os números que aparecem no painel

| Termo | O que significa |
|---|---|
| **Alertas** | Quantidade de polígonos de desmatamento detectados no período |
| **Área (ha)** | Área total desmatada, em hectares |
| **Irregular** | Área desmatada **sem** instrumento válido de autorização |
| **Autorizado** (pleno) | ASV válida cobre **≥ 99%** do polígono desmatado |
| **Autoriz. parcial** | Existe ASV válida, mas ela cobre **só parte** do polígono — o desmate extrapolou a área autorizada (o excedente segue como irregular) |
| **Regularizado** | Área que foi regularizada depois |
| **IPI** | **Índice de Pressão Irregular** = `área irregular ÷ área total × 100` |

O **IPI** é a métrica-chave: quanto maior, maior a fração de desmatamento ilegal.
Ele também entra com **peso 50%** no [IPA](ipa).

> **Como o IPI é calculado:** é baseado em **área**, não em contagem de alertas —
> `área irregular / área total`. Ex.: em 2022 o Piauí teve 247.174 ha irregulares de
> 301.092 ha totais → IPI 82,1%. A série vem caindo (82,1 → 76,1 → 51,6 → 28,2 de
> 2022 a 2025), o que é uma boa notícia.

## Fonte da série anual — por que RPC ao vivo

Os cards, a tabela anual e o IPI vêm da função **`get_resumo_anual`** no Supabase
upstream — a **mesma** que a dashboard de referência usa. Ela recomputa as áreas a
partir da **geometria real** dos alertas. Antes o CGEO+ lia um arquivo estático
(`resumo_estatico.json`) que estava **defasado** e subnotificava a área em 2-6× — isso
foi corrigido em 2026-07-17. A RPC é pesada; o sync mensal a chama com retry e, se ela
estiver fora do ar, cai para uma derivação a partir do agregado municipal (dado vivo)
— nunca para o arquivo defasado.

> **Duas escalas de área (não é erro):** o total anual (~300k ha/ano) usa a área "crua"
> dos alertas + autorizações; o mapa do **Panorama Municipal** usa o `agregado_municipios`,
> que é deduplicado por município (~150k ha/ano). São recortes diferentes do mesmo dado —
> a referência convive com os dois. O número autoritativo de cada visão é o KPI daquela aba.

## O que cada slide mostra

- **Série anual + IPI:** evolução dos alertas, da área e do IPI ano a ano.
- **Sazonalidade mensal:** em que meses o desmatamento se concentra.
- **Panorama municipal (mapa):** área desmatada por município (coroplético).
- **Ranking:** municípios com mais área irregular.
- **Leitura CGEO+:** o [IPA](ipa).

## Filtro "Todos os anos" (modo agregado)

Ao escolher **Todos os anos** no seletor, o painel passa a somar a série inteira de
forma **coerente entre todas as visões**: os KPIs, a **composição fundiária** e o
**mapa + ranking** do Panorama Municipal agregam ano a ano (área irregular somada por
município; IPI/percentual recalculado sobre os totais). Antes, a composição e o mapa
caíam no **último ano** enquanto os KPIs somavam a série — o que fazia as classes
(Autorizado, Regularizado) parecerem sumir no agregado. O IPA continua sendo a leitura
do ano mais recente com dados (é um score datado, não um acumulado).

> **Autorizado pleno × parcial:** a RPC anual autoritativa entrega só o autorizado
> **total** (funde pleno + parcial). O split existe no `agregado_municipios`
> (`ha_autorizado` × `ha_autorizado_parcialmente`), porém numa escala deduplicada,
> diferente da RPC. Para não misturar escalas na mesma fatia, o CGEO+ aplica ao total
> autoritativo da RPC a **proporção de parcial** medida no agregado municipal daquele
> ano — pleno + parcial somam exatamente o autorizado total da RPC. Ex.: 2024 → 42,9%
> de parcial ⇒ 175.824 ha parcial + 233.776 ha pleno = 409.600 ha.

## Ano corrente é parcial

O ano em curso aparece marcado como **"parcial"** — ele só fica completo depois do
último sync do ano. Para o ano corrente, o CGEO+ deriva a linha anual somando os
municípios (o resumo oficial demora mais a sair), então os **números ainda estão em
formação** e sobem a cada sync mensal — não confunda com a classe *Autoriz. parcial*,
que é uma categoria fundiária (ASV cobrindo parte do polígono).

## Fonte e limitações

- **Fonte:** série anual pela RPC `get_resumo_anual` (ao vivo); sazonalidade mensal
  por `monthly_alertas.json`; município e split por bioma pelo `agregado_municipios`.
- **MATOPIBA** foi **descartado** por decisão do projeto — nenhum recorte MATOPIBA
  aparece neste ambiente.
- A atualização é automática — ver [Atualização automática](atualizacao-automatica).
