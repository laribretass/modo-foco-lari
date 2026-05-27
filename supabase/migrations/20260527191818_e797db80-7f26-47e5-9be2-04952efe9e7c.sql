
-- 1) Tabela de sessões de questões
CREATE TABLE IF NOT EXISTS public.sessoes_questoes (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  topico_id int NOT NULL REFERENCES public.topicos(id) ON DELETE CASCADE,
  questoes_feitas int NOT NULL CHECK (questoes_feitas > 0),
  questoes_acertos int NOT NULL CHECK (questoes_acertos >= 0),
  data date NOT NULL DEFAULT CURRENT_DATE,
  hora timestamptz NOT NULL DEFAULT now(),
  revisao_id bigint REFERENCES public.revisoes_agendadas(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_acertos_validos CHECK (questoes_acertos <= questoes_feitas)
);

CREATE INDEX IF NOT EXISTS idx_sessoes_user_data ON public.sessoes_questoes(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_topico ON public.sessoes_questoes(topico_id, hora DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes_questoes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sessoes_questoes_id_seq TO authenticated;
GRANT ALL ON public.sessoes_questoes TO service_role;
GRANT ALL ON SEQUENCE public.sessoes_questoes_id_seq TO service_role;

ALTER TABLE public.sessoes_questoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessoes_questoes_own ON public.sessoes_questoes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Profiles: meta de questões
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meta_questoes_dia int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS meta_questoes_automatica boolean NOT NULL DEFAULT true;

-- 3) Trigger: somar no tópico após insert
CREATE OR REPLACE FUNCTION public.atualizar_topico_apos_sessao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.topicos
  SET questoes_feitas = questoes_feitas + NEW.questoes_feitas,
      questoes_acertos = questoes_acertos + NEW.questoes_acertos,
      ultima_atividade = now()
  WHERE id = NEW.topico_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_topico_sessao ON public.sessoes_questoes;
CREATE TRIGGER trg_atualizar_topico_sessao
  AFTER INSERT ON public.sessoes_questoes
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_topico_apos_sessao();

-- 4) Trigger: descontar no tópico após delete
CREATE OR REPLACE FUNCTION public.descontar_topico_apos_delete_sessao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.topicos
  SET questoes_feitas = GREATEST(0, questoes_feitas - OLD.questoes_feitas),
      questoes_acertos = GREATEST(0, questoes_acertos - OLD.questoes_acertos)
  WHERE id = OLD.topico_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_descontar_topico_sessao ON public.sessoes_questoes;
CREATE TRIGGER trg_descontar_topico_sessao
  AFTER DELETE ON public.sessoes_questoes
  FOR EACH ROW EXECUTE FUNCTION public.descontar_topico_apos_delete_sessao();

-- 5) Trigger: ajustar tópico após update (delta)
CREATE OR REPLACE FUNCTION public.ajustar_topico_apos_update_sessao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.topicos
  SET questoes_feitas = GREATEST(0, questoes_feitas + (NEW.questoes_feitas - OLD.questoes_feitas)),
      questoes_acertos = GREATEST(0, questoes_acertos + (NEW.questoes_acertos - OLD.questoes_acertos)),
      ultima_atividade = now()
  WHERE id = NEW.topico_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ajustar_topico_sessao ON public.sessoes_questoes;
CREATE TRIGGER trg_ajustar_topico_sessao
  AFTER UPDATE OF questoes_feitas, questoes_acertos ON public.sessoes_questoes
  FOR EACH ROW EXECUTE FUNCTION public.ajustar_topico_apos_update_sessao();

-- 6) Função: meta automática
CREATE OR REPLACE FUNCTION public.calcular_meta_questoes_automatica(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_prova date;
  v_dias_restantes int;
  v_total_topicos int;
  v_topicos_feitos int;
  v_meta_por_topico int := 30;
  v_questoes_faltam int;
  v_meta_dia int;
BEGIN
  SELECT data_prova INTO v_data_prova FROM public.profiles WHERE id = p_user_id;
  IF v_data_prova IS NULL THEN RETURN 50; END IF;

  v_dias_restantes := v_data_prova - CURRENT_DATE;
  IF v_dias_restantes <= 0 THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_total_topicos FROM public.topicos WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_topicos_feitos FROM public.topicos
    WHERE user_id = p_user_id AND questoes_feitas >= v_meta_por_topico;

  v_questoes_faltam := GREATEST(0, (v_total_topicos - v_topicos_feitos) * v_meta_por_topico);
  IF v_questoes_faltam = 0 THEN RETURN 20; END IF;

  v_meta_dia := CEIL(v_questoes_faltam::numeric / GREATEST(1, (v_dias_restantes * 6 / 7)))::int;
  v_meta_dia := GREATEST(20, LEAST(150, v_meta_dia));
  RETURN v_meta_dia;
END;
$$;

-- 7) Função: atualizar meta diária no profile
CREATE OR REPLACE FUNCTION public.atualizar_meta_questoes_diaria(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_automatica boolean;
  v_nova_meta int;
BEGIN
  SELECT meta_questoes_automatica INTO v_automatica FROM public.profiles WHERE id = p_user_id;
  IF v_automatica THEN
    v_nova_meta := public.calcular_meta_questoes_automatica(p_user_id);
    UPDATE public.profiles SET meta_questoes_dia = v_nova_meta WHERE id = p_user_id;
  END IF;
END;
$$;

-- 8) Função: progresso de hoje
CREATE OR REPLACE FUNCTION public.questoes_de_hoje(p_user_id uuid)
RETURNS TABLE (
  questoes_feitas int,
  questoes_acertos int,
  meta_dia int,
  pct_meta numeric,
  sessoes_realizadas int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.questoes_feitas), 0)::int,
    COALESCE(SUM(s.questoes_acertos), 0)::int,
    p.meta_questoes_dia,
    CASE WHEN p.meta_questoes_dia > 0
      THEN ROUND(COALESCE(SUM(s.questoes_feitas), 0)::numeric / p.meta_questoes_dia * 100, 0)
      ELSE 0 END,
    COUNT(s.id)::int
  FROM public.profiles p
  LEFT JOIN public.sessoes_questoes s
    ON s.user_id = p.id AND s.data = CURRENT_DATE
  WHERE p.id = p_user_id
  GROUP BY p.meta_questoes_dia;
END;
$$;
