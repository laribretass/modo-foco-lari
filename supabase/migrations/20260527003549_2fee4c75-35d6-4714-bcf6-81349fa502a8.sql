
CREATE OR REPLACE FUNCTION public.popular_agenda_dia(p_user UUID, p_data DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow INTEGER := EXTRACT(DOW FROM p_data)::INTEGER;
  v_inserted INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH disc_do_dia AS (
    SELECT disciplina_id FROM public.grade_semanal
    WHERE user_id = p_user AND dia_semana = v_dow
  ),
  topicos_rank AS (
    SELECT
      t.id AS topico_id, t.disciplina_id,
      CASE
        WHEN NOT t.pre_aula_feita THEN 'Pré-aula'
        WHEN NOT t.teoria_feita THEN 'Teoria'
        WHEN NOT t.mapeamento_feito THEN 'Mapeamento'
        WHEN t.questoes_feitas < 10 THEN 'Questões'
        WHEN NOT t.revisao1_feita THEN 'Revisão 1'
        WHEN NOT t.revisao2_feita THEN 'Revisão 2'
        WHEN NOT t.flashcards_feitos THEN 'Flashcards'
        ELSE 'Concluído'
      END AS proxima,
      ROW_NUMBER() OVER (PARTITION BY t.disciplina_id ORDER BY
        (CASE t.recorrencia WHEN 'Alta' THEN 30 WHEN 'Média' THEN 20 ELSE 10 END)
        + LEAST(EXTRACT(EPOCH FROM (now() - t.ultima_atividade))/86400 * 2, 20)::INTEGER DESC
      ) AS rn
    FROM public.topicos t
    JOIN disc_do_dia d ON d.disciplina_id = t.disciplina_id
    WHERE t.user_id = p_user
      AND NOT (t.pre_aula_feita AND t.teoria_feita AND t.mapeamento_feito
               AND t.questoes_feitas >= 10 AND t.revisao1_feita AND t.revisao2_feita
               AND t.flashcards_feitos)
  )
  INSERT INTO public.agenda_diaria (user_id, data_prevista, topico_id, disciplina_id, proxima_acao, status)
  SELECT p_user, p_data, tr.topico_id, tr.disciplina_id, tr.proxima, 'pendente'
  FROM topicos_rank tr
  WHERE tr.rn <= 2 AND tr.proxima <> 'Concluído'
  ON CONFLICT (user_id, data_prevista, topico_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_agenda_concluida() FROM PUBLIC, anon, authenticated;
