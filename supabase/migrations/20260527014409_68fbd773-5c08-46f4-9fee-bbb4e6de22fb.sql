
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meta_topicos_dia int NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS nivel_meta text NOT NULL DEFAULT 'normal';

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_nivel_meta_check
    CHECK (nivel_meta IN ('leve','normal','intenso','personalizado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.agenda_diaria
  ADD COLUMN IF NOT EXISTS faz_parte_meta_dia boolean NOT NULL DEFAULT true;

-- Garante constraint única usada pelos ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS agenda_diaria_user_data_topico_uniq
  ON public.agenda_diaria (user_id, data_prevista, topico_id);

CREATE OR REPLACE FUNCTION public.garantir_plano_dia(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_meta int;
  v_existentes int;
  v_falta int;
  v_dia_semana int := extract(dow from current_date);
begin
  select coalesce(meta_topicos_dia, 4) into v_meta from profiles where id = p_user_id;
  if v_meta is null then v_meta := 4; end if;

  select count(*) into v_existentes
  from agenda_diaria
  where user_id = p_user_id
    and data_prevista = current_date
    and faz_parte_meta_dia = true;

  v_falta := v_meta - v_existentes;
  if v_falta <= 0 then return; end if;

  insert into agenda_diaria (user_id, topico_id, data_prevista, disciplina_id, proxima_acao, status, faz_parte_meta_dia)
  select
    p_user_id,
    t.id,
    current_date,
    t.disciplina_id,
    case
      when not t.pre_aula_feita then 'Pré-aula'
      when not t.teoria_feita then 'Teoria'
      when not t.mapeamento_feito then 'Mapeamento'
      when t.questoes_feitas < 10 then 'Questões'
      when not t.revisao1_feita then 'Revisão 1'
      when not t.revisao2_feita then 'Revisão 2'
      when not t.flashcards_feitos then 'Flashcards'
      else 'Concluído'
    end,
    'pendente',
    true
  from topicos t
  join grade_semanal g
    on g.disciplina_id = t.disciplina_id
   and g.user_id = p_user_id
   and g.dia_semana = v_dia_semana
  where t.user_id = p_user_id
    and not (t.pre_aula_feita and t.teoria_feita and t.mapeamento_feito
             and t.questoes_feitas >= 10 and t.revisao1_feita and t.revisao2_feita
             and t.flashcards_feitos)
    and not exists (
      select 1 from agenda_diaria a
      where a.user_id = p_user_id and a.topico_id = t.id
        and a.data_prevista = current_date
    )
  order by
    case t.recorrencia when 'Alta' then 1 when 'Média' then 2 else 3 end,
    random()
  limit v_falta
  on conflict (user_id, data_prevista, topico_id) do nothing;
end;
$$;

CREATE OR REPLACE FUNCTION public.adicionar_topico_extra(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_topico_id int;
  v_disc_id int;
  v_proxima text;
  v_dia_semana int := extract(dow from current_date);
begin
  select t.id, t.disciplina_id,
    case
      when not t.pre_aula_feita then 'Pré-aula'
      when not t.teoria_feita then 'Teoria'
      when not t.mapeamento_feito then 'Mapeamento'
      when t.questoes_feitas < 10 then 'Questões'
      when not t.revisao1_feita then 'Revisão 1'
      when not t.revisao2_feita then 'Revisão 2'
      when not t.flashcards_feitos then 'Flashcards'
      else 'Concluído'
    end
  into v_topico_id, v_disc_id, v_proxima
  from topicos t
  join grade_semanal g
    on g.disciplina_id = t.disciplina_id
   and g.user_id = p_user_id
   and g.dia_semana = v_dia_semana
  where t.user_id = p_user_id
    and not (t.pre_aula_feita and t.teoria_feita and t.mapeamento_feito
             and t.questoes_feitas >= 10 and t.revisao1_feita and t.revisao2_feita
             and t.flashcards_feitos)
    and not exists (
      select 1 from agenda_diaria a
      where a.user_id = p_user_id and a.topico_id = t.id
        and a.data_prevista = current_date
    )
  order by
    case t.recorrencia when 'Alta' then 1 when 'Média' then 2 else 3 end,
    random()
  limit 1;

  if v_topico_id is not null then
    insert into agenda_diaria (user_id, topico_id, data_prevista, disciplina_id, proxima_acao, status, faz_parte_meta_dia)
    values (p_user_id, v_topico_id, current_date, v_disc_id, coalesce(v_proxima, 'Teoria'), 'pendente', false)
    on conflict (user_id, data_prevista, topico_id) do nothing;
  end if;

  return v_topico_id;
end;
$$;

GRANT EXECUTE ON FUNCTION public.garantir_plano_dia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_topico_extra(uuid) TO authenticated;
