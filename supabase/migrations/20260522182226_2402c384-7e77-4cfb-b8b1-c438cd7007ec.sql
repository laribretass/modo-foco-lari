
-- =====================================================
-- FOCO TOTAL - Schema completo
-- =====================================================

-- 1. profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nome text,
  meta_diaria_questoes int not null default 30,
  meta_acerto_pct int not null default 70,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- 2. disciplinas (compartilhada / pública)
create table public.disciplinas (
  id serial primary key,
  nome text not null unique,
  cor text not null,
  icone text,
  area text not null
);
alter table public.disciplinas enable row level security;
create policy "disciplinas_read_all" on public.disciplinas for select using (true);

insert into public.disciplinas (nome, cor, icone, area) values
('Redação', '#EF4444', 'PenLine', 'Redação'),
('Linguagens', '#F59E0B', 'BookOpen', 'Linguagens'),
('Matemática', '#3B82F6', 'Calculator', 'Matemática'),
('Biologia', '#10B981', 'Leaf', 'Naturezas'),
('Química', '#8B5CF6', 'FlaskConical', 'Naturezas'),
('Física', '#EC4899', 'Atom', 'Naturezas'),
('Geografia', '#14B8A6', 'Globe', 'Humanas'),
('História', '#F97316', 'Landmark', 'Humanas'),
('Sociologia', '#6366F1', 'Users', 'Humanas'),
('Filosofia', '#A855F7', 'Brain', 'Humanas');

-- 3. grade_semanal
create table public.grade_semanal (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  disciplina_id int not null references public.disciplinas(id),
  ordem int not null default 0,
  unique(user_id, dia_semana, disciplina_id)
);
alter table public.grade_semanal enable row level security;
create policy "grade_all_own" on public.grade_semanal for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. topicos
create table public.topicos (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  disciplina_id int not null references public.disciplinas(id),
  tema text not null,
  subtema text,
  recorrencia text not null default 'Média' check (recorrencia in ('Alta','Média','Baixa')),
  mapeamento_feito boolean not null default false,
  mapeamento_data timestamptz,
  pre_aula_feita boolean not null default false,
  pre_aula_acertos int not null default 0,
  teoria_feita boolean not null default false,
  teoria_data timestamptz,
  questoes_feitas int not null default 0,
  questoes_acertos int not null default 0,
  revisao1_feita boolean not null default false,
  revisao1_acertos int not null default 0,
  revisao1_data timestamptz,
  revisao2_feita boolean not null default false,
  revisao2_acertos int not null default 0,
  revisao2_data timestamptz,
  flashcards_feitos boolean not null default false,
  observacoes text,
  ultima_atividade timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_topicos_user_disc on public.topicos(user_id, disciplina_id);
alter table public.topicos enable row level security;
create policy "topicos_all_own" on public.topicos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. sessoes_estudo
create table public.sessoes_estudo (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data date not null,
  topico_id int not null references public.topicos(id) on delete cascade,
  tipo_atividade text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  unique(user_id, data, topico_id, tipo_atividade)
);
create index idx_sessoes_user_data on public.sessoes_estudo(user_id, data);
alter table public.sessoes_estudo enable row level security;
create policy "sessoes_all_own" on public.sessoes_estudo for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. simulados
create table public.simulados (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  data date,
  redacao_nota int,
  linguagens_acertos int,
  humanas_acertos int,
  naturezas_acertos int,
  matematica_acertos int,
  observacoes text,
  created_at timestamptz not null default now()
);
alter table public.simulados enable row level security;
create policy "simulados_all_own" on public.simulados for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. caixa_preta_questoes
create table public.caixa_preta_questoes (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  simulado_id int references public.simulados(id) on delete cascade,
  numero_questao int,
  disciplina_id int references public.disciplinas(id),
  assunto text,
  tipo_erro int check (tipo_erro between 1 and 4),
  passo1_refazer boolean not null default false,
  passo2_voltar_conteudo boolean not null default false,
  passo3_resolucao_comentada boolean not null default false,
  passo4_flashcard boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now()
);
alter table public.caixa_preta_questoes enable row level security;
create policy "caixa_q_all_own" on public.caixa_preta_questoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. caixa_preta_redacao
create table public.caixa_preta_redacao (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data date,
  tema text,
  tempo_minutos int,
  c1 int not null default 0,
  c2 int not null default 0,
  c3 int not null default 0,
  c4 int not null default 0,
  c5 int not null default 0,
  correcao_feita boolean not null default false,
  reescrita_feita boolean not null default false,
  nota_reescrita int,
  observacoes text,
  created_at timestamptz not null default now()
);
alter table public.caixa_preta_redacao enable row level security;
create policy "redacao_all_own" on public.caixa_preta_redacao for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 9. ferramenta_coragem
create table public.ferramenta_coragem (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  disciplina_id int references public.disciplinas(id),
  capitulo text,
  tema text,
  importancia text check (importancia in ('Alta','Média','Baixa')),
  teoria_feita boolean not null default false,
  questoes_feitas boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now()
);
alter table public.ferramenta_coragem enable row level security;
create policy "coragem_all_own" on public.ferramenta_coragem for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
