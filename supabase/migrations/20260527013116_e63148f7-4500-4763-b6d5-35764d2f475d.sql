
-- Catálogo global
CREATE TABLE public.repertorios_catalogo (
  id SERIAL PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('filosofo','dado','filme','obra','lei')),
  nome TEXT NOT NULL,
  subtitulo TEXT,
  descricao TEXT NOT NULL,
  dica_uso TEXT,
  temas_relacionados TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.repertorios_catalogo TO authenticated;
GRANT ALL ON public.repertorios_catalogo TO service_role;
ALTER TABLE public.repertorios_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalogo_leitura_publica" ON public.repertorios_catalogo
  FOR SELECT TO authenticated USING (true);

-- Histórico por usuário
CREATE TABLE public.repertorios_diarios (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  repertorio_id INT NOT NULL REFERENCES public.repertorios_catalogo(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  ja_conhece BOOLEAN NOT NULL DEFAULT false,
  salvo BOOLEAN NOT NULL DEFAULT false,
  visto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, data, repertorio_id)
);
CREATE INDEX idx_rep_diarios_user_data ON public.repertorios_diarios(user_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repertorios_diarios TO authenticated;
GRANT ALL ON public.repertorios_diarios TO service_role;
ALTER TABLE public.repertorios_diarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diarios_proprios" ON public.repertorios_diarios
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contador de trocas no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS repertorios_trocas_data DATE,
  ADD COLUMN IF NOT EXISTS repertorios_trocas_count INT NOT NULL DEFAULT 0;
