
ALTER TABLE public.topicos
  ADD COLUMN IF NOT EXISTS revisao1_agendada_para date,
  ADD COLUMN IF NOT EXISTS revisao2_agendada_para date;

CREATE OR REPLACE FUNCTION public.schedule_revisoes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.teoria_feita = true AND COALESCE(OLD.teoria_feita, false) = false THEN
    IF NEW.revisao1_agendada_para IS NULL AND NEW.revisao1_feita = false THEN
      NEW.revisao1_agendada_para := (CURRENT_DATE + INTERVAL '1 day')::date;
    END IF;
    IF NEW.revisao2_agendada_para IS NULL AND NEW.revisao2_feita = false THEN
      NEW.revisao2_agendada_para := (CURRENT_DATE + INTERVAL '7 days')::date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_revisoes ON public.topicos;
CREATE TRIGGER trg_schedule_revisoes
  BEFORE UPDATE ON public.topicos
  FOR EACH ROW EXECUTE FUNCTION public.schedule_revisoes();

-- Deduplicação preventiva antes de criar índice único
DELETE FROM public.sessoes_estudo a
USING public.sessoes_estudo b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.topico_id = b.topico_id
  AND a.data = b.data
  AND a.tipo_atividade = b.tipo_atividade;

CREATE UNIQUE INDEX IF NOT EXISTS sessoes_unique_per_day
  ON public.sessoes_estudo (user_id, topico_id, data, tipo_atividade);
