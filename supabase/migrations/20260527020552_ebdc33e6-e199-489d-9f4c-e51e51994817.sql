
-- Extensão pra normalizar acentos no matching de nomes
create extension if not exists unaccent;

-- 1) Catálogo global da sequência didática
create table public.sequencia_didatica_padrao (
  id serial primary key,
  disciplina_slug text not null,
  tema text not null,
  ordem int not null,
  depende_de text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);
create index idx_seq_disciplina_ordem on public.sequencia_didatica_padrao(disciplina_slug, ordem);

grant select on public.sequencia_didatica_padrao to authenticated;
grant all on public.sequencia_didatica_padrao to service_role;

alter table public.sequencia_didatica_padrao enable row level security;
create policy "seq_leitura_publica" on public.sequencia_didatica_padrao
  for select to authenticated using (true);

-- 2) Vínculos reais de pré-requisitos por user
create table public.topico_prerequisitos (
  id serial primary key,
  user_id uuid not null,
  topico_id int not null references public.topicos(id) on delete cascade,
  prerequisito_topico_id int not null references public.topicos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(topico_id, prerequisito_topico_id)
);
create index idx_prereq_topico on public.topico_prerequisitos(topico_id);
create index idx_prereq_user on public.topico_prerequisitos(user_id);

grant select, insert, update, delete on public.topico_prerequisitos to authenticated;
grant all on public.topico_prerequisitos to service_role;

alter table public.topico_prerequisitos enable row level security;
create policy "prereq_own" on public.topico_prerequisitos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Campos novos em topicos
alter table public.topicos
  add column if not exists ordem_didatica int not null default 999,
  add column if not exists dominado boolean not null default false,
  add column if not exists dominado_em timestamptz;

-- 4) Função: critério simplificado de "dominado"
-- >= 10 questões, >= 80% acertos, revisão 1 e revisão 2 feitas
create or replace function public.topico_esta_dominado(p_topico_id int)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_qf int; v_qa int; v_r1 bool; v_r2 bool;
begin
  select questoes_feitas, questoes_acertos, revisao1_feita, revisao2_feita
    into v_qf, v_qa, v_r1, v_r2
  from public.topicos where id = p_topico_id;

  if v_qf is null or v_qf < 10 then return false; end if;
  if not coalesce(v_r1,false) then return false; end if;
  if not coalesce(v_r2,false) then return false; end if;
  if (v_qa::numeric / v_qf) < 0.80 then return false; end if;
  return true;
end;
$$;

-- 5) Atualiza campo dominado/dominado_em
create or replace function public.atualizar_status_dominado(p_topico_id int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_dom bool;
begin
  v_dom := public.topico_esta_dominado(p_topico_id);
  update public.topicos
  set dominado = v_dom,
      dominado_em = case when v_dom and dominado_em is null then now()
                         when not v_dom then null
                         else dominado_em end
  where id = p_topico_id;
end;
$$;

-- 6) Trigger pra atualizar automaticamente quando muda relevante
create or replace function public.trigger_atualizar_dominado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.atualizar_status_dominado(new.id);
  return new;
end;
$$;

drop trigger if exists trg_atualizar_dominado on public.topicos;
create trigger trg_atualizar_dominado
after update of questoes_feitas, questoes_acertos, revisao1_feita, revisao2_feita
on public.topicos
for each row
execute function public.trigger_atualizar_dominado();

-- 7) Listar pré-requisitos com progresso (consolidação via revisões)
create or replace function public.listar_prerequisitos_com_progresso(p_topico_id int, p_user_id uuid)
returns table (
  prerequisito_id int,
  prerequisito_tema text,
  prerequisito_subtema text,
  pct_acertos int,
  pct_consolidacao int,
  dominado boolean,
  proxima_acao text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    t.id,
    t.tema,
    t.subtema,
    case when t.questoes_feitas > 0
      then round((t.questoes_acertos::numeric / t.questoes_feitas) * 100)::int
      else 0 end,
    case
      when t.revisao2_feita then 100
      when t.revisao1_feita then 50
      when t.teoria_feita then 25
      else 0 end,
    t.dominado,
    case
      when not t.mapeamento_feito then 'Mapear'
      when not t.pre_aula_feita then 'Pré-aula'
      when not t.teoria_feita then 'Estudar teoria'
      when t.questoes_feitas < 10 then 'Fazer questões'
      when not t.revisao1_feita then 'Revisão 1'
      when not t.revisao2_feita then 'Revisão 2'
      else 'Revisar'
    end
  from public.topico_prerequisitos tp
  join public.topicos t on t.id = tp.prerequisito_topico_id
  where tp.topico_id = p_topico_id
    and tp.user_id = p_user_id
  order by t.dominado desc, t.ordem_didatica;
end;
$$;

-- 8) Popular vínculos do user baseado na sequência padrão (match por nome+disciplina, ignorando acentos)
create or replace function public.popular_prerequisitos_user(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inseridos int := 0;
  r record;
  v_prereq_id int;
  v_prereq_nome text;
begin
  -- Primeiro atualiza ordem_didatica de cada tópico do user baseado no catálogo
  update public.topicos t
  set ordem_didatica = s.ordem
  from public.sequencia_didatica_padrao s
  join public.disciplinas d on lower(unaccent(d.nome)) = s.disciplina_slug
  where t.user_id = p_user_id
    and t.disciplina_id = d.id
    and lower(unaccent(t.tema)) = lower(unaccent(s.tema));

  -- Depois cria vínculos
  for r in
    select t.id as topico_id, s.depende_de
    from public.topicos t
    join public.disciplinas d on d.id = t.disciplina_id
    join public.sequencia_didatica_padrao s
      on s.disciplina_slug = lower(unaccent(d.nome))
     and lower(unaccent(s.tema)) = lower(unaccent(t.tema))
    where t.user_id = p_user_id
      and array_length(s.depende_de, 1) > 0
  loop
    foreach v_prereq_nome in array r.depende_de loop
      select t2.id into v_prereq_id
      from public.topicos t2
      where t2.user_id = p_user_id
        and lower(unaccent(t2.tema)) = lower(unaccent(v_prereq_nome))
      limit 1;

      if v_prereq_id is not null and v_prereq_id <> r.topico_id then
        insert into public.topico_prerequisitos (topico_id, prerequisito_topico_id, user_id)
        values (r.topico_id, v_prereq_id, p_user_id)
        on conflict (topico_id, prerequisito_topico_id) do nothing;
        if found then v_inseridos := v_inseridos + 1; end if;
      end if;
    end loop;
  end loop;

  return v_inseridos;
end;
$$;
