
-- 1. Tabela agenda_diaria
CREATE TABLE public.agenda_diaria (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  data_prevista DATE NOT NULL,
  topico_id INTEGER NOT NULL REFERENCES public.topicos(id) ON DELETE CASCADE,
  disciplina_id INTEGER NOT NULL,
  proxima_acao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  CONSTRAINT agenda_status_chk CHECK (status IN ('pendente','concluido','dispensado')),
  CONSTRAINT agenda_unique UNIQUE (user_id, data_prevista, topico_id)
);

CREATE INDEX idx_agenda_user_status ON public.agenda_diaria(user_id, status, data_prevista);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_diaria TO authenticated;
GRANT ALL ON public.agenda_diaria TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agenda_diaria_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.agenda_diaria_id_seq TO service_role;

ALTER TABLE public.agenda_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_all_own ON public.agenda_diaria
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Função popular_agenda_dia
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
  WITH disc_do_dia AS (
    SELECT disciplina_id, ordem
    FROM public.grade_semanal
    WHERE user_id = p_user AND dia_semana = v_dow
  ),
  topicos_rank AS (
    SELECT
      t.id AS topico_id,
      t.disciplina_id,
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
      (CASE t.recorrencia WHEN 'Alta' THEN 30 WHEN 'Média' THEN 20 ELSE 10 END)
      + LEAST(EXTRACT(EPOCH FROM (now() - t.ultima_atividade))/86400 * 2, 20)::INTEGER
      + CASE WHEN t.questoes_feitas > 0 AND (t.questoes_acertos::FLOAT / t.questoes_feitas) < 0.6 THEN 15 ELSE 0 END
      AS score,
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

GRANT EXECUTE ON FUNCTION public.popular_agenda_dia(UUID, DATE) TO authenticated, service_role;

-- 3. Trigger: ao concluir sessão, marca agenda_diaria correspondente
CREATE OR REPLACE FUNCTION public.marcar_agenda_concluida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.concluido = true THEN
    UPDATE public.agenda_diaria
    SET status = 'concluido', concluido_em = now()
    WHERE user_id = NEW.user_id
      AND topico_id = NEW.topico_id
      AND status = 'pendente'
      AND data_prevista <= NEW.data;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_agenda_concluida ON public.sessoes_estudo;
CREATE TRIGGER trg_marcar_agenda_concluida
AFTER INSERT OR UPDATE ON public.sessoes_estudo
FOR EACH ROW EXECUTE FUNCTION public.marcar_agenda_concluida();

-- 4. pg_cron diário 08:00 UTC (= 5h BRT)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'popular-agendas-diarias',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--6fb20764-bc71-4612-9b7c-d57b6fa079e7.lovable.app/api/public/cron/popular-agendas',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyam5kdnp6eHh0a3VraWtvbWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjA3MzIsImV4cCI6MjA5NTAzNjczMn0.DpEqaP2NdbXRa-Avv-AYVbNf7KQQ99fvLJ4sFBEqKkg"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
