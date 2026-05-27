
-- 1) Novas colunas em topicos
ALTER TABLE public.topicos
  ADD COLUMN IF NOT EXISTS exercicios_feitos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exercicios_data timestamptz,
  ADD COLUMN IF NOT EXISTS concluido_em timestamptz;

-- 2) Tabela de revisões agendadas
CREATE TABLE IF NOT EXISTS public.revisoes_agendadas (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  topico_id integer NOT NULL,
  disciplina_id integer NOT NULL,
  numero_revisao smallint NOT NULL CHECK (numero_revisao BETWEEN 1 AND 5),
  data_prevista date NOT NULL,
  status text NOT NULL DEFAULT 'futura' CHECK (status IN ('futura','pendente','atrasada','concluida')),
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topico_id, numero_revisao)
);

CREATE INDEX IF NOT EXISTS idx_revisoes_user_data ON public.revisoes_agendadas (user_id, data_prevista);
CREATE INDEX IF NOT EXISTS idx_revisoes_status ON public.revisoes_agendadas (user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revisoes_agendadas TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.revisoes_agendadas_id_seq TO authenticated;
GRANT ALL ON public.revisoes_agendadas TO service_role;
GRANT ALL ON SEQUENCE public.revisoes_agendadas_id_seq TO service_role;

ALTER TABLE public.revisoes_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY revisoes_all_own ON public.revisoes_agendadas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Função: cria revisões automaticamente respeitando data_prova
CREATE OR REPLACE FUNCTION public.criar_revisoes_automaticas(p_topico_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topico record;
  v_data_enem date;
  v_data_limite date;
  v_intervalos int[] := ARRAY[1,7,15,30,60];
  v_intervalo int;
  v_numero int;
  v_data_rev date;
  v_base date;
BEGIN
  SELECT t.id, t.user_id, t.disciplina_id, t.teoria_feita, t.exercicios_feitos, t.concluido_em
    INTO v_topico
  FROM public.topicos t WHERE t.id = p_topico_id;

  IF v_topico IS NULL THEN RETURN; END IF;
  IF NOT (v_topico.teoria_feita AND v_topico.exercicios_feitos) THEN RETURN; END IF;

  -- Marca conclusão se ainda não tinha
  IF v_topico.concluido_em IS NULL THEN
    UPDATE public.topicos SET concluido_em = now() WHERE id = p_topico_id;
    v_base := CURRENT_DATE;
  ELSE
    v_base := v_topico.concluido_em::date;
  END IF;

  SELECT data_prova INTO v_data_enem FROM public.profiles WHERE id = v_topico.user_id;
  IF v_data_enem IS NOT NULL THEN
    v_data_limite := v_data_enem - INTERVAL '15 days';
  END IF;

  FOR v_numero IN 1..5 LOOP
    v_intervalo := v_intervalos[v_numero];
    v_data_rev := v_base + v_intervalo;
    IF v_data_limite IS NOT NULL AND v_data_rev > v_data_limite THEN
      CONTINUE;
    END IF;
    INSERT INTO public.revisoes_agendadas
      (user_id, topico_id, disciplina_id, numero_revisao, data_prevista, status)
    VALUES
      (v_topico.user_id, p_topico_id, v_topico.disciplina_id, v_numero, v_data_rev,
       CASE WHEN v_data_rev = CURRENT_DATE THEN 'pendente'
            WHEN v_data_rev < CURRENT_DATE THEN 'atrasada'
            ELSE 'futura' END)
    ON CONFLICT (user_id, topico_id, numero_revisao) DO NOTHING;
  END LOOP;
END;
$$;

-- 4) Trigger em topicos
CREATE OR REPLACE FUNCTION public.trg_topicos_conclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.teoria_feita AND NEW.exercicios_feitos AND NEW.concluido_em IS NULL THEN
    PERFORM public.criar_revisoes_automaticas(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS topicos_conclusao_trg ON public.topicos;
CREATE TRIGGER topicos_conclusao_trg
AFTER INSERT OR UPDATE OF teoria_feita, exercicios_feitos ON public.topicos
FOR EACH ROW EXECUTE FUNCTION public.trg_topicos_conclusao();

-- 5) Atualizar status diariamente
CREATE OR REPLACE FUNCTION public.atualizar_status_revisoes(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.revisoes_agendadas
     SET status = 'atrasada'
   WHERE user_id = p_user_id AND status IN ('futura','pendente') AND data_prevista < CURRENT_DATE;

  UPDATE public.revisoes_agendadas
     SET status = 'pendente'
   WHERE user_id = p_user_id AND status = 'futura' AND data_prevista = CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_revisoes_automaticas(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_revisoes(uuid) TO authenticated;
