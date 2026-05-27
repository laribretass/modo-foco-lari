
-- Ensure unique (user_id, data) for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS repertorios_diarios_user_data_uniq
  ON public.repertorios_diarios (user_id, data);

CREATE OR REPLACE FUNCTION public.sortear_repertorio_dia(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_repertorio_id int;
  v_ultima_categoria text;
  v_data_hoje date := current_date;
begin
  select repertorio_id into v_repertorio_id
  from repertorios_diarios
  where user_id = p_user_id and data = v_data_hoje;

  if v_repertorio_id is not null then
    return v_repertorio_id;
  end if;

  select rc.categoria into v_ultima_categoria
  from repertorios_diarios rd
  join repertorios_catalogo rc on rc.id = rd.repertorio_id
  where rd.user_id = p_user_id
  order by rd.data desc
  limit 1;

  select id into v_repertorio_id
  from repertorios_catalogo
  where ativo = true
    and (v_ultima_categoria is null or categoria <> v_ultima_categoria)
    and id not in (
      select repertorio_id from repertorios_diarios
      where user_id = p_user_id and ja_conhece = true
    )
    and id not in (
      select repertorio_id from repertorios_diarios
      where user_id = p_user_id and data > current_date - interval '30 days'
    )
  order by random()
  limit 1;

  if v_repertorio_id is null then
    select id into v_repertorio_id
    from repertorios_catalogo
    where ativo = true
      and id not in (
        select repertorio_id from repertorios_diarios
        where user_id = p_user_id and ja_conhece = true
      )
    order by random()
    limit 1;
  end if;

  if v_repertorio_id is not null then
    insert into repertorios_diarios (user_id, repertorio_id, data)
    values (p_user_id, v_repertorio_id, v_data_hoje)
    on conflict (user_id, data) do nothing;
  end if;

  return v_repertorio_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.trocar_repertorio_dia(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_trocas int;
  v_data_trocas date;
  v_novo_id int;
begin
  select repertorios_trocas_count, repertorios_trocas_data
  into v_trocas, v_data_trocas
  from profiles where id = p_user_id;

  if v_data_trocas is null or v_data_trocas <> current_date then
    v_trocas := 0;
  end if;

  if v_trocas >= 3 then
    raise exception 'Limite de trocas diárias atingido';
  end if;

  delete from repertorios_diarios
  where user_id = p_user_id and data = current_date;

  v_novo_id := sortear_repertorio_dia(p_user_id);

  update profiles
  set repertorios_trocas_count = v_trocas + 1,
      repertorios_trocas_data = current_date
  where id = p_user_id;

  return v_novo_id;
end;
$$;

GRANT EXECUTE ON FUNCTION public.sortear_repertorio_dia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trocar_repertorio_dia(uuid) TO authenticated;
