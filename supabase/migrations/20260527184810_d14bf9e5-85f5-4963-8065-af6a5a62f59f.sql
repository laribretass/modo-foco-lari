-- Adicionar colunas para revisões 3, 4 e 5 (se não existirem)
ALTER TABLE public.topicos
  ADD COLUMN IF NOT EXISTS revisao3_feita boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisao3_data timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revisao3_acertos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revisao4_feita boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisao4_data timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revisao4_acertos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revisao5_feita boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revisao5_data timestamp with time zone,
  ADD COLUMN IF NOT EXISTS revisao5_acertos integer NOT NULL DEFAULT 0;

-- Função de trigger: marca revisões 1..5 conforme questoes_feitas (thresholds 10/20/30/40/50)
CREATE OR REPLACE FUNCTION public.atualizar_revisoes_por_questoes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Revisão 1: 10+
  IF NEW.questoes_feitas >= 10 AND (OLD.revisao1_feita IS FALSE OR OLD.revisao1_feita IS NULL) THEN
    NEW.revisao1_feita := true;
    NEW.revisao1_data := now();
  END IF;

  -- Revisão 2: 20+
  IF NEW.questoes_feitas >= 20 AND (OLD.revisao2_feita IS FALSE OR OLD.revisao2_feita IS NULL) THEN
    NEW.revisao2_feita := true;
    NEW.revisao2_data := now();
  END IF;

  -- Revisão 3: 30+
  IF NEW.questoes_feitas >= 30 AND (OLD.revisao3_feita IS FALSE OR OLD.revisao3_feita IS NULL) THEN
    NEW.revisao3_feita := true;
    NEW.revisao3_data := now();
  END IF;

  -- Revisão 4: 40+
  IF NEW.questoes_feitas >= 40 AND (OLD.revisao4_feita IS FALSE OR OLD.revisao4_feita IS NULL) THEN
    NEW.revisao4_feita := true;
    NEW.revisao4_data := now();
  END IF;

  -- Revisão 5: 50+
  IF NEW.questoes_feitas >= 50 AND (OLD.revisao5_feita IS FALSE OR OLD.revisao5_feita IS NULL) THEN
    NEW.revisao5_feita := true;
    NEW.revisao5_data := now();
  END IF;

  -- Reset descendente
  IF NEW.questoes_feitas < 10 THEN
    NEW.revisao1_feita := false;
    NEW.revisao2_feita := false;
    NEW.revisao3_feita := false;
    NEW.revisao4_feita := false;
    NEW.revisao5_feita := false;
  ELSIF NEW.questoes_feitas < 20 THEN
    NEW.revisao2_feita := false;
    NEW.revisao3_feita := false;
    NEW.revisao4_feita := false;
    NEW.revisao5_feita := false;
  ELSIF NEW.questoes_feitas < 30 THEN
    NEW.revisao3_feita := false;
    NEW.revisao4_feita := false;
    NEW.revisao5_feita := false;
  ELSIF NEW.questoes_feitas < 40 THEN
    NEW.revisao4_feita := false;
    NEW.revisao5_feita := false;
  ELSIF NEW.questoes_feitas < 50 THEN
    NEW.revisao5_feita := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_revisoes_questoes ON public.topicos;

CREATE TRIGGER trg_atualizar_revisoes_questoes
  BEFORE UPDATE OF questoes_feitas
  ON public.topicos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_revisoes_por_questoes();

-- Atualizar dados existentes
UPDATE public.topicos SET revisao1_feita = true, revisao1_data = COALESCE(revisao1_data, now())
  WHERE questoes_feitas >= 10 AND revisao1_feita IS NOT TRUE;
UPDATE public.topicos SET revisao2_feita = true, revisao2_data = COALESCE(revisao2_data, now())
  WHERE questoes_feitas >= 20 AND revisao2_feita IS NOT TRUE;
UPDATE public.topicos SET revisao3_feita = true, revisao3_data = COALESCE(revisao3_data, now())
  WHERE questoes_feitas >= 30 AND revisao3_feita IS NOT TRUE;
UPDATE public.topicos SET revisao4_feita = true, revisao4_data = COALESCE(revisao4_data, now())
  WHERE questoes_feitas >= 40 AND revisao4_feita IS NOT TRUE;
UPDATE public.topicos SET revisao5_feita = true, revisao5_data = COALESCE(revisao5_data, now())
  WHERE questoes_feitas >= 50 AND revisao5_feita IS NOT TRUE;