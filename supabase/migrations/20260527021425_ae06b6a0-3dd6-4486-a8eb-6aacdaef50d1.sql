
alter table public.profiles
  add column if not exists data_prova date,
  add column if not exists nivel_dedicacao text default 'normal',
  add column if not exists modo_atraso text default 'rigoroso',
  add column if not exists objetivo_cobertura text default 'consolidar_todos';

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'profiles_modo_atraso_check'
  ) then
    alter table public.profiles
      add constraint profiles_modo_atraso_check
      check (modo_atraso in ('rigoroso','compreensivo'));
  end if;
end$$;

create table if not exists public.cronograma_fases (
  id serial primary key,
  user_id uuid not null,
  numero_fase int not null,
  nome text not null,
  descricao text,
  data_inicio date not null,
  data_fim date not null,
  meta_topicos_total int not null default 0,
  meta_topicos_atingidos int not null default 0,
  concluida boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, numero_fase)
);

grant select, insert, update, delete on public.cronograma_fases to authenticated;
grant all on public.cronograma_fases to service_role;
grant usage, select on sequence public.cronograma_fases_id_seq to authenticated;
grant all on sequence public.cronograma_fases_id_seq to service_role;

alter table public.cronograma_fases enable row level security;

drop policy if exists "cronograma_own" on public.cronograma_fases;
create policy "cronograma_own" on public.cronograma_fases
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.inicializar_cronograma(p_user_id uuid, p_data_prova date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_fase1_fim date;
  v_fase2_fim date;
  v_dias int;
begin
  select count(*) into v_total from public.topicos where user_id = p_user_id;
  if v_total = 0 then v_total := 252; end if;

  v_dias := p_data_prova - current_date;
  if v_dias <= 0 then
    v_fase1_fim := p_data_prova;
    v_fase2_fim := p_data_prova;
  else
    v_fase1_fim := current_date + (v_dias * 0.55)::int;
    v_fase2_fim := current_date + (v_dias * 0.85)::int;
  end if;

  delete from public.cronograma_fases where user_id = p_user_id;

  insert into public.cronograma_fases (user_id, numero_fase, nome, descricao, data_inicio, data_fim, meta_topicos_total)
  values
    (p_user_id, 1, 'Ver Tudo',
     'Passar uma vez por cada tópico: mapeamento + teoria + 10 questões',
     current_date, v_fase1_fim, v_total),
    (p_user_id, 2, 'Revisar',
     'Revisão 1 + Revisão 2 nos tópicos vistos. Simulados semanais.',
     v_fase1_fim + 1, v_fase2_fim, v_total),
    (p_user_id, 3, 'Consolidar',
     'Flashcards + dominar (80%+). Simulados 2x/semana, redação 2x/semana.',
     v_fase2_fim + 1, p_data_prova, v_total);
end;
$$;

create or replace function public.calcular_status_cronograma(p_user_id uuid)
returns table (
  fase_atual_numero int,
  fase_atual_nome text,
  fase_data_inicio date,
  fase_data_fim date,
  dias_restantes_fase int,
  dias_restantes_prova int,
  meta_total int,
  feitos int,
  faltam int,
  topicos_dia_necessario numeric,
  topicos_dia_ritmo_atual numeric,
  dias_atraso int,
  severidade text,
  mensagem text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fase record;
  v_feitos int;
  v_dias_passados int;
  v_dias_totais_fase int;
  v_esperado int;
  v_data_prova date;
begin
  select data_prova into v_data_prova from public.profiles where id = p_user_id;

  select * into v_fase
  from public.cronograma_fases
  where user_id = p_user_id
    and current_date between data_inicio and data_fim
  order by numero_fase
  limit 1;

  if v_fase is null then
    select * into v_fase
    from public.cronograma_fases
    where user_id = p_user_id and not concluida
    order by data_inicio
    limit 1;
  end if;

  if v_fase is null then
    select * into v_fase
    from public.cronograma_fases
    where user_id = p_user_id
    order by numero_fase desc
    limit 1;
  end if;

  if v_fase is null then return; end if;

  if v_fase.numero_fase = 1 then
    select count(*) into v_feitos
    from public.topicos
    where user_id = p_user_id and teoria_feita = true and questoes_feitas >= 10;
  elsif v_fase.numero_fase = 2 then
    select count(*) into v_feitos
    from public.topicos
    where user_id = p_user_id and revisao1_feita = true and revisao2_feita = true;
  else
    select count(*) into v_feitos
    from public.topicos
    where user_id = p_user_id and dominado = true;
  end if;

  fase_atual_numero := v_fase.numero_fase;
  fase_atual_nome := v_fase.nome;
  fase_data_inicio := v_fase.data_inicio;
  fase_data_fim := v_fase.data_fim;
  dias_restantes_fase := greatest(0, v_fase.data_fim - current_date);
  dias_restantes_prova := greatest(0, coalesce(v_data_prova, v_fase.data_fim) - current_date);
  meta_total := v_fase.meta_topicos_total;
  feitos := v_feitos;
  faltam := greatest(0, v_fase.meta_topicos_total - v_feitos);

  if dias_restantes_fase > 0 then
    topicos_dia_necessario := faltam::numeric / dias_restantes_fase;
  else
    topicos_dia_necessario := faltam;
  end if;

  v_dias_passados := greatest(1, current_date - v_fase.data_inicio + 1);
  topicos_dia_ritmo_atual := v_feitos::numeric / v_dias_passados;

  v_dias_totais_fase := greatest(1, v_fase.data_fim - v_fase.data_inicio + 1);
  v_esperado := (v_dias_passados::numeric / v_dias_totais_fase * v_fase.meta_topicos_total)::int;

  if v_feitos >= v_esperado then
    dias_atraso := 0;
  else
    dias_atraso := ((v_esperado - v_feitos) / greatest(topicos_dia_necessario, 0.1))::int;
  end if;

  if dias_atraso = 0 then
    severidade := 'no_ritmo';
    mensagem := 'No ritmo! Continue assim.';
  elsif dias_atraso <= 3 then
    severidade := 'leve';
    mensagem := format('Você está %s dias atrasado. Dá pra recuperar.', dias_atraso);
  elsif dias_atraso <= 7 then
    severidade := 'moderado';
    mensagem := format('%s dias de atraso. Intensifique nos próximos dias.', dias_atraso);
  elsif dias_atraso <= 14 then
    severidade := 'alto';
    mensagem := format('%s dias atrasado. Use os dias de 8h pra recuperar.', dias_atraso);
  else
    severidade := 'critico';
    mensagem := format('%s dias atrasado. Talvez seja hora de reduzir o escopo.', dias_atraso);
  end if;

  return next;
end;
$$;

create or replace function public.ajustar_meta_diaria_automatica(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modo text;
  v_topicos_necessarios numeric;
  v_meta_atual int;
  v_nova_meta int;
begin
  select modo_atraso into v_modo from public.profiles where id = p_user_id;
  if v_modo is null or v_modo <> 'rigoroso' then return; end if;

  select topicos_dia_necessario into v_topicos_necessarios
  from public.calcular_status_cronograma(p_user_id);

  if v_topicos_necessarios is null then return; end if;

  select meta_topicos_dia into v_meta_atual from public.profiles where id = p_user_id;
  if v_meta_atual is null then v_meta_atual := 4; end if;

  v_nova_meta := greatest(2, least(8, ceil(v_topicos_necessarios)::int));

  if v_nova_meta > v_meta_atual then
    update public.profiles set meta_topicos_dia = v_nova_meta where id = p_user_id;
  end if;
end;
$$;
