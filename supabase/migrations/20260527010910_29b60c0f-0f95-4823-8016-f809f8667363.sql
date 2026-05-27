
CREATE TABLE public.anki_revisoes_diarias (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  feito_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, data)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anki_revisoes_diarias TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.anki_revisoes_diarias_id_seq TO authenticated;
GRANT ALL ON public.anki_revisoes_diarias TO service_role;
GRANT ALL ON SEQUENCE public.anki_revisoes_diarias_id_seq TO service_role;

ALTER TABLE public.anki_revisoes_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anki_all_own" ON public.anki_revisoes_diarias
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_anki_user_data ON public.anki_revisoes_diarias (user_id, data DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anki_lembrete_ativo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anki_lembrete_horario TIME NOT NULL DEFAULT '20:00';
