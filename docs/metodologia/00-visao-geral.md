# Visão geral — Monitoramento Externo

> **Última revisão:** 2026-07-17 · **Vale para:** módulos `/monitoramento/mapbiomas`, `/prodes`, `/queimadas`

Esta seção explica, em linguagem simples, **de onde vêm os dados** dos três painéis
de pressão ambiental do CGEO+ e **como eles chegam até a tela**. Não é tradução dos
dados — é o mapa da metodologia.

## O que é o Monitoramento Externo

O CGEO+ acompanha três monitoramentos federais de pressão ambiental sobre o Piauí:

| Painel | O que mede | Fonte original |
|---|---|---|
| **MapBiomas Alerta** | Desmatamento detectado e se ele tinha autorização | MapBiomas |
| **PRODES Cerrado** | Confirmação cruzada do desmatamento por satélite | INPE |
| **Queimadas** | Área queimada e onde ela atinge zonas prioritárias | INPE (AQ1km) |

Cada painel é um **ambiente** próprio, com dashboard em formato de apresentação
(slides). No topo de todos há a **Timeline das bases** mostrando quando cada base
foi atualizada pela última vez e quando é a próxima janela.

## Como o dado chega até a tela

O CGEO+ **não recalcula** o desmatamento nem as queimadas. Ele consome um pipeline
externo já pronto (`cgeo-sync.vercel.app` + um banco de apoio) e guarda uma **cópia
atualizada** (um "snapshot") no banco do próprio CGEO+. Os dashboards leem só essa
cópia — por isso são rápidos e não dependem da infra de terceiros ficar no ar.

```
Fonte federal (MapBiomas / INPE)
        │
        ▼
Pipeline upstream  ──►  cgeo-sync.vercel.app  +  banco de apoio (qb_*)
        │
        ▼   (cron do CGEO+, 1× por janela)
Snapshot no Supabase do CGEO+  (tabelas monit_ext_*)
        │
        ▼
Dashboards  /monitoramento/{mapbiomas,prodes,queimadas}
```

A etapa do meio (**cron**) roda automaticamente em datas fixas — ver
[Atualização automática](atualizacao-automatica).

## O que é o IPA (resumo)

Além dos três painéis, o CGEO+ cria uma leitura própria: o **IPA — Índice de Pressão
Ambiental**, uma nota de 0 a 100 por município que **junta os três monitoramentos
num ranking único**. Ele aparece no último slide ("Leitura CGEO+") de cada dashboard.
Detalhes em [IPA](ipa).

## Por que os números às vezes diferem entre gráficos

Cada base federal é produzida por um processo diferente, então **totais podem não
fechar exatamente** entre um gráfico e outro (ex.: a soma por classe de queimada vs.
o total do estado). Onde isso acontece, o painel deixa explícito — por exemplo, a
faixa **"Não classificada"** no gráfico de classes das Queimadas. O número
autoritativo de cada painel é sempre o **KPI do topo** e o **mapa municipal**.
