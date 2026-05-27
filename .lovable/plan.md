## Sistema de Revisões Automáticas + Calendário

### 1. Banco de dados (migração)

Criar tabela `revisoes_agendadas`:
- `id`, `user_id`, `topico_id`, `disciplina_id`
- `numero_revisao` (1 a 5)
- `data_prevista` (date)
- `status` ('futura' | 'pendente' | 'atrasada' | 'concluida')
- `concluido_em` (timestamp, nullable)
- `created_at`
- UNIQUE (user_id, topico_id, numero_revisao) — evita duplicidade
- RLS por `auth.uid() = user_id`, GRANTs para authenticated

Adicionar em `profiles`:
- `data_enem` (date, nullable) — data oficial do ENEM (já existe `data_prova`, reutilizar)

Adicionar em `topicos`:
- `exercicios_feitos` (boolean, default false) — novo marcador
- `concluido_em` (timestamp, nullable) — quando teoria+exercícios foram marcados

Função SQL `criar_revisoes_automaticas(p_topico_id)`:
- Se topico tem `teoria_feita=true` E `exercicios_feitos=true` E `concluido_em IS NULL`:
  - Marca `concluido_em = now()`
  - Para cada intervalo [1,7,15,30,60]:
    - calcula `data_revisao = hoje + intervalo dias`
    - busca `data_enem` do profile; calcula `data_limite = data_enem - 15 dias`
    - se `data_enem` existe e `data_revisao > data_limite`: pula
    - INSERT ON CONFLICT DO NOTHING em `revisoes_agendadas`

Trigger: após UPDATE em `topicos` quando teoria+exercicios viram true, chama a função.

Função `atualizar_status_revisoes(p_user_id)`:
- futura → pendente quando data = hoje
- pendente/futura → atrasada quando data < hoje

### 2. Página principal (filtro)

`PlanoDoDia.tsx` e `AtrasadosCard.tsx`: filtrar para esconder tópicos com `concluido_em IS NOT NULL`.

O scoring em `lib/estudos.ts` já trata "Concluído" — adicionar filtro server-side via flag em `popular_agenda_dia` (apenas tópicos não-concluídos vão para agenda).

### 3. Detalhe da matéria (`materias.$id.tsx`)

- Adicionar checkpoint "Exercícios" (substitui ou complementa "Mapeamento"/"Questões")
- Ao marcar teoria + exercícios → mostra toast "Conteúdo concluído! Revisões agendadas." e o tópico ganha badge "EM REVISÃO"
- Tópicos concluídos vão para uma seção colapsada "Concluídos (em revisão)"

### 4. Nova rota `/revisoes`

Página com 3 abas + calendário:
- **Hoje**: status = 'pendente'
- **Atrasadas**: status = 'atrasada' (com dias de atraso)
- **Próximas**: status = 'futura' (com "faltam X dias")

Cada card: matéria (cor), módulo, aula, "Revisão N", data, status. Botão "Marcar como feita" → status=concluida + concluido_em, registra sessão.

### 5. Calendário (`/revisoes/calendario` ou aba)

Usar `Calendar` shadcn em `mode="single"`:
- `modifiers` destacam dias com revisões (cor por status agregado: vermelho atrasada, azul hoje, cinza futura)
- Ao clicar num dia, painel lateral lista as revisões daquela data
- Navegação mensal nativa do react-day-picker

### 6. Navegação

Adicionar item "Revisões" no menu principal (verificar onde fica o menu — provavelmente `_authenticated.tsx`).

### 7. Job/atualização de status

- Reaproveitar o cron `popular-agendas` ou adicionar chamada em `ensureAgendaHoje` para executar `atualizar_status_revisoes(user)`.

### Detalhes técnicos

- Server fn `concluirRevisao(revisaoId)` — protegida com `requireSupabaseAuth`
- Server fn `regenerarRevisoes(topicoId)` — fallback manual
- Queries client-side direto via `supabase.from('revisoes_agendadas')` (RLS protege)
- Sem duplicar dados: `revisoes_agendadas` é fonte única; `topicos.revisao1/2_*` campos antigos continuam intocados (legado)

### Ordem de implementação

1. Migração SQL (tabela + colunas + função + trigger)
2. Atualizar `PlanoDoDia` / `AtrasadosCard` para filtrar concluídos
3. Adicionar checkpoint "Exercícios" em `materias.$id.tsx`
4. Criar rota `/revisoes` com tabs + cards
5. Adicionar calendário
6. Adicionar link no menu
