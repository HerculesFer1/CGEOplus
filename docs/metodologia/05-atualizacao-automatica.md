# Atualização automática

> **Última revisão:** 2026-07-17 · **Vale para:** os três ambientes · **Código:** `src/lib/monit-ext/`, `vercel.json`

Esta página explica **como o CGEO+ se mantém atualizado** sozinho e **como você sabe**
se a última atualização deu certo.

## Como funciona

O CGEO+ tem três **tarefas agendadas** (cron) na Vercel. Cada uma busca a base mais
recente no upstream e regrava o snapshot no banco do CGEO+. Elas rodam **sozinhas**,
em datas fixas:

| Base | Quando roda | Por quê nessa data |
|---|---|---|
| **MapBiomas** | Dia **6** de cada mês, 04h UTC | O upstream libera dia 5; rodamos 1 dia depois |
| **Queimadas** | Dia **15** de cada mês, 04h UTC | O INPE fecha o mês anterior por volta do dia 14 |
| **PRODES** | Dia **2 de outubro**, 04h UTC | O ciclo PRODES sai em 1º de outubro |

Cada execução grava uma linha de auditoria na tabela `monit_ext_execucao`
(status, nº de registros, duração, mensagem de erro se houver). A ingestão é
**idempotente**: rodar de novo não duplica dado, só atualiza.

## Como saber se atualizou

No topo de **todos** os ambientes há a **Timeline das bases**. Para cada base ela mostra:

- **"Atualizado há N dias"** — quando foi o último sync bem-sucedido.
- **"Próxima janela em N dias"** — quando é a próxima atualização esperada.
- Um **sinal de status**:

| Sinal | Significado |
|---|---|
| ✅ verde | Em dia |
| ⚠️ âmbar | Passou da janela esperada (atenção) |
| 🔴 vermelho | Atrasado (> ~52 dias sem sync mensal) — investigar |
| ⚪ cinza | Sem sync ainda |

Ou seja: **se um cron parar de rodar, a Timeline fica vermelha sozinha** — é o alarme
embutido.

## Segurança

As rotas de cron (`/api/cron/monit/*`) são protegidas por um segredo (`CRON_SECRET`).
Só quem manda o cabeçalho `Authorization: Bearer <segredo>` consegue disparar — a
Vercel faz isso automaticamente. Sem o segredo configurado, a rota responde **401 e
não faz nada** (silenciosamente).

## Se algo parecer desatualizado

1. Olhe a **Timeline das bases** — o sinal diz se está atrasado.
2. Confira na Vercel → **Crons** o último e o próximo disparo das três rotas.
3. Confirme que a variável `CRON_SECRET` está configurada na Vercel (sem espaços).
4. Em último caso, um sync pode ser disparado manualmente na rota correspondente.

> **Observação (2026-07):** até esta data só houve syncs **manuais** — as janelas
> agendadas ainda não tinham ocorrido desde o deploy do módulo. A primeira execução
> automática confirmará o agendamento; acompanhe pela Timeline.
