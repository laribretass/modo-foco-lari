ALTER TABLE public.topicos ADD COLUMN IF NOT EXISTS modulo TEXT;
CREATE INDEX IF NOT EXISTS idx_topicos_modulo ON public.topicos (disciplina_id, modulo, ordem_didatica);