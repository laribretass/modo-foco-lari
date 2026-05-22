# Foco Total — Plano de Construção

Sistema PWA mobile-first para organização de estudos ENEM, substituindo planilha por interface moderna com algoritmo de priorização diária.

## Escopo realista

O pedido é gigantesco (9 páginas complexas, ~290 tópicos seed, algoritmo de priorização, dashboards, Caixa Preta, PWA, gamificação). Entregar **tudo absolutamente perfeito em um único deploy** não é realista — vou priorizar para ter o sistema **100% utilizável ponta a ponta** já no primeiro deploy, com as telas críticas polidas e as secundárias funcionais.

## Stack

- TanStack Start (template Lovable) + TypeScript + Tailwind + shadcn/ui
- **Lovable Cloud** (Supabase gerenciado) — Auth + Postgres + RLS
- TanStack Query para dados, Zustand só se necessário
- Recharts, lucide-react, date-fns, framer-motion
- PWA leve (manifest + ícone instalável, sem service worker — evita problemas no preview Lovable)

## Fase 1 — Fundação

1. Habilitar Lovable Cloud
2. Migration: todas as 9 tabelas + RLS + seeds de `disciplinas` e função `handle_new_user` que popula `profiles`, `grade_semanal` padrão e os ~290 tópicos de Bio/Quim/Mat ao criar conta
3. Design system (`styles.css`): paleta off-white quente + dark, cores das 10 disciplinas como tokens, Inter via Google Fonts, radius/sombras
4. Auth (email/senha) — telas `/login` e `/signup`, layout `_authenticated`
5. Shell: bottom tab mobile + sidebar desktop, com 5 abas

## Fase 2 — Telas core

6. **Hoje (`/`)** — saudação, streak, progresso do dia, carrossel de matérias do dia, lista priorizada de tópicos com check rápido, FAB de registro rápido. Algoritmo de priorização no servidor (server fn).
7. **Matérias (`/materias`)** — grid 10 disciplinas + página `/materias/$id` com filtros, lista por tema, modal de detalhes do tópico (todos os 6 checkpoints editáveis)
8. **Progresso (`/progresso`)** — KPIs, gráficos Recharts (barras por matéria, linha 30 dias, radar de cobertura, evolução simulados, radar redação, pontos críticos)

## Fase 3 — Simulados & secundárias

9. **Simulados (`/simulados`)** — tab Geral (CRUD com nomes pré-sugeridos Enem 2013-2025) + tab Caixa Preta (questões erradas com 4 passos + dashboards pizza/barras/heatmap)
10. **Mais** → Grade semanal editável, Redação (sliders C1-C5), Ferramenta da Coragem, Configurações

## Fase 4 — Polish

11. Dark mode, micro-animações framer-motion nos checks, manifest PWA instalável, empty states
12. Streak + conquistas básicas

## Algoritmo de priorização

Implementado como `createServerFn` `getTopicosParaHoje` exatamente conforme especificado: recorrência + estado do tópico + decay temporal + boost para baixo % acertos + penalidade se já estudado hoje. Fim de semana → tópicos críticos globais.

## Notas técnicas

- RLS em todas as tabelas com `user_id`, policies `auth.uid() = user_id`
- Trigger `on_auth_user_created` chama function que faz seed completo (idempotente)
- Server fns para todas as leituras/escritas autenticadas via `requireSupabaseAuth`
- **Sem Google OAuth no v1** (pode ser adicionado depois) — só email/senha pra não atrasar
- **Sem service worker PWA** — apenas manifest + ícones (instalável, sem riscos no preview)
- **Sem notificações nativas / pull-to-refresh / swipe-to-delete** no v1 — listado como "futuro" no próprio prompt

## O que pode precisar de iteração após o deploy

Dado o volume, espere ajustes finos em: animações específicas, edge cases do algoritmo, polish visual de gráficos, drag-and-drop da grade (vou começar com edição via select). A base estará 100% funcional.

Posso começar?
