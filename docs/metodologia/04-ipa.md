# IPA — Índice de Pressão Ambiental

> **Última revisão:** 2026-07-17 · **Vale para:** slide "Leitura CGEO+" de todos os dashboards · **Código:** `src/lib/monit-ext/ipa-score.ts`

O IPA é uma **invenção do CGEO+** — ele **não existe** nos dashboards federais. Por
isso vale a pena entendê-lo com calma: é a única métrica desta seção que nós criamos.

## O problema que o IPA resolve

Você tem três monitoramentos separados (desmatamento, confirmação PRODES, queimadas).
Um município pode estar mal num e bem noutro. Como responder à pergunta **"onde a
pressão ambiental é maior, no geral?"** sem olhar três rankings ao mesmo tempo?

O IPA responde isso com **uma nota de 0 a 100 por município**. Quanto maior, maior a
pressão combinada.

## Como é calculado

O IPA é uma **média ponderada** de três "pressões", cada uma já numa escala de 0 a 100:

| Peso | Pressão | O que é | De onde vem |
|---|---|---|---|
| **50%** | **IPI** | % do desmatamento que foi **sem autorização** (ilegal) | MapBiomas |
| **30%** | **Fogo prioritário** | % da área queimada em **zona de alta prioridade** (classe AHP 4-5) | Queimadas |
| **20%** | **Divergência PRODES** | `100 − concordância` (quanto MapBiomas e PRODES **discordam**) | PRODES |

Fórmula base:

```
IPA = 0,50 × IPI  +  0,30 × Fogo prioritário  +  0,20 × Divergência PRODES
```

## A regra importante: renormalização

Nem todo município tem os três dados. **Dado que falta NÃO vira "pressão zero"** — os
pesos se **redistribuem** entre as pressões presentes.

**Exemplo:** um município tem IPI = 80 e Fogo = 40, mas **não tem** PRODES.

- Só sobram os pesos 50% (IPI) e 30% (Fogo), que somam 80%.
- Eles são reescalados para somar 100%: `50/80 = 62,5%` e `30/80 = 37,5%`.
- IPA = `0,625 × 80 + 0,375 × 40` = **65**.

Se o município tivesse os três, o divisor seria 100% e nada mudaria.

## Como ler a nota

| Faixa | Leitura | Cor no painel |
|---|---|---|
| **≥ 70** | Prioridade máxima | 🔴 vermelho |
| **50 – 69** | Pressão média | 🟠 âmbar |
| **< 50** | Pressão baixa | 🟢 verde |

No card de cada município o painel mostra também as três parcelas
(`IPI`, `Fogo`, `ΔPR`) para você ver **de onde** veio a nota. Um traço `—` significa
que aquela fonte não tinha cobertura do município no ano.

## O que o IPA NÃO é

- **Não substitui** as métricas individuais — o IPI, a concordância e o % em área
  prioritária continuam publicados cada um no seu dashboard.
- **Não é uma medida oficial** — é uma leitura executiva do CGEO+ para priorizar
  triagem de campo, não base para autuação.

## Se precisar mudar

Os pesos (50/30/20) estão em `IPA_PESOS` no arquivo
`src/lib/monit-ext/constants.ts`. **Foram validados com o gestor — não altere sem
confirmar.** Se mudar os pesos ou a composição, **atualize esta página** (é a regra de
sincronia da documentação).
