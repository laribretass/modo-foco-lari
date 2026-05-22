
CREATE TEMP TABLE _seed (disciplina_id int, tema text, recorrencia text);

INSERT INTO _seed VALUES
(6,'Cinemática escalar','Alta'),(6,'Cinemática vetorial','Média'),(6,'Leis de Newton','Alta'),
(6,'Trabalho e Energia','Alta'),(6,'Energia mecânica e conservação','Alta'),(6,'Impulso e quantidade de movimento','Média'),
(6,'Estática e equilíbrio','Média'),(6,'Hidrostática','Alta'),(6,'Gravitação universal','Baixa'),
(6,'Termometria','Média'),(6,'Calorimetria','Alta'),(6,'Dilatação térmica','Média'),
(6,'Mudanças de estado','Média'),(6,'Termodinâmica','Alta'),(6,'Gases ideais','Média'),
(6,'Óptica geométrica','Alta'),(6,'Espelhos e lentes','Média'),(6,'Ondas - conceitos','Alta'),
(6,'Acústica','Média'),(6,'MHS','Baixa'),(6,'Eletrostática','Média'),
(6,'Corrente, resistência e Lei de Ohm','Alta'),(6,'Circuitos elétricos','Alta'),(6,'Potência e consumo elétrico','Alta'),
(6,'Magnetismo','Média'),(6,'Indução eletromagnética','Baixa'),(6,'Física moderna','Baixa'),
(7,'Cartografia e projeções','Alta'),(7,'Fusos horários','Média'),(7,'Estrutura geológica e relevo','Média'),
(7,'Clima e tempo','Alta'),(7,'Hidrografia','Média'),(7,'Biomas brasileiros','Alta'),
(7,'Domínios morfoclimáticos','Média'),(7,'Questões ambientais globais','Alta'),(7,'Recursos hídricos e energia','Alta'),
(7,'Urbanização e metrópoles','Alta'),(7,'Industrialização brasileira','Média'),(7,'Agropecuária e agronegócio','Alta'),
(7,'Reforma agrária e conflitos no campo','Média'),(7,'Globalização','Alta'),(7,'Blocos econômicos','Média'),
(7,'Geopolítica mundial','Alta'),(7,'Migrações','Alta'),(7,'Demografia brasileira','Alta'),
(7,'Mercado de trabalho e desemprego','Média'),(7,'Geografia da fome e desigualdade','Alta'),
(7,'Regionalização do Brasil','Média'),(7,'Oriente Médio e conflitos','Média'),
(8,'Pré-história e civilizações antigas','Baixa'),(8,'Grécia e Roma','Baixa'),(8,'Feudalismo','Baixa'),
(8,'Renascimento e Reforma','Média'),(8,'Expansão marítima e colonização','Média'),(8,'Brasil Colônia - economia','Média'),
(8,'Brasil Colônia - sociedade e escravidão','Alta'),(8,'Iluminismo','Média'),(8,'Revolução Francesa','Média'),
(8,'Revolução Industrial','Alta'),(8,'Independência do Brasil','Média'),(8,'Primeiro e Segundo Reinado','Média'),
(8,'Abolição da escravidão','Alta'),(8,'República Velha','Alta'),(8,'Era Vargas','Alta'),
(8,'Populismo e democracia (1945-64)','Média'),(8,'Ditadura Militar','Alta'),(8,'Redemocratização e Nova República','Alta'),
(8,'Primeira Guerra Mundial','Média'),(8,'Revolução Russa','Média'),(8,'Crise de 29 e entreguerras','Média'),
(8,'Nazifascismo','Alta'),(8,'Segunda Guerra Mundial','Alta'),(8,'Guerra Fria','Alta'),
(8,'Descolonização Afro-Asiática','Média'),(8,'Globalização e mundo contemporâneo','Alta'),
(8,'História da África','Alta'),(8,'Movimentos sociais no Brasil','Alta'),(8,'Cultura afro-brasileira e indígena','Alta'),
(9,'O que é Sociologia','Média'),(9,'Comte e o Positivismo','Baixa'),(9,'Durkheim - fato social','Alta'),
(9,'Weber - ação social','Alta'),(9,'Marx - luta de classes','Alta'),(9,'Cultura e identidade','Alta'),
(9,'Indústria cultural','Alta'),(9,'Cidadania e direitos','Alta'),(9,'Movimentos sociais','Alta'),
(9,'Trabalho e relações de produção','Alta'),(9,'Estado e poder','Média'),(9,'Democracia','Alta'),
(9,'Desigualdade social','Alta'),(9,'Estratificação social','Média'),(9,'Globalização e sociedade','Alta'),
(9,'Violência urbana','Média'),(9,'Etnocentrismo e relativismo','Alta'),
(10,'O que é Filosofia','Média'),(10,'Pré-socráticos','Baixa'),(10,'Sócrates','Média'),
(10,'Platão','Alta'),(10,'Aristóteles','Alta'),(10,'Filosofia medieval - Agostinho e Tomás','Baixa'),
(10,'Maquiavel','Alta'),(10,'Contratualistas (Hobbes, Locke, Rousseau)','Alta'),(10,'Iluminismo','Média'),
(10,'Kant','Média'),(10,'Hegel','Baixa'),(10,'Marx (filosofia)','Alta'),
(10,'Nietzsche','Alta'),(10,'Escola de Frankfurt','Média'),(10,'Existencialismo - Sartre','Média'),
(10,'Foucault e poder','Alta'),(10,'Ética e moral','Alta'),(10,'Bioética','Média'),
(10,'Filosofia política contemporânea','Alta'),(10,'Estética','Média'),
(2,'Interpretação de texto','Alta'),(2,'Funções da linguagem','Alta'),(2,'Variação linguística','Alta'),
(2,'Figuras de linguagem','Alta'),(2,'Gêneros textuais','Alta'),(2,'Tipos textuais','Alta'),
(2,'Coesão e coerência','Alta'),(2,'Semântica - sinonímia e ambiguidade','Média'),(2,'Intertextualidade','Alta'),
(2,'Concordância verbal e nominal','Média'),(2,'Regência','Média'),(2,'Crase','Média'),
(2,'Pontuação','Média'),(2,'Quinhentismo e Barroco','Baixa'),(2,'Arcadismo','Baixa'),
(2,'Romantismo','Média'),(2,'Realismo e Naturalismo','Média'),(2,'Parnasianismo e Simbolismo','Baixa'),
(2,'Pré-Modernismo','Média'),(2,'Modernismo - 1ª fase','Alta'),(2,'Modernismo - 2ª fase','Alta'),
(2,'Modernismo - 3ª fase','Média'),(2,'Literatura contemporânea','Média'),(2,'Artes visuais - movimentos','Média'),
(2,'Música popular brasileira','Média'),(2,'Cinema e teatro','Baixa'),(2,'Educação Física - esporte e sociedade','Média'),
(2,'Educação Física - saúde','Média'),(2,'Inglês - interpretação','Alta'),(2,'Espanhol - interpretação','Alta'),
(1,'Estrutura dissertativo-argumentativa','Alta'),(1,'C1 - Norma culta','Alta'),(1,'C2 - Compreensão do tema','Alta'),
(1,'C3 - Argumentação','Alta'),(1,'C4 - Coesão','Alta'),(1,'C5 - Proposta de intervenção','Alta'),
(1,'Repertório sociocultural','Alta'),(1,'Conectivos','Alta'),(1,'Introdução - técnicas','Alta'),
(1,'Desenvolvimento - argumentos','Alta'),(1,'Conclusão - 5 elementos','Alta'),(1,'Temas sociais recorrentes','Alta'),
(1,'Direitos humanos - respeito','Alta');

INSERT INTO public.topicos (user_id, disciplina_id, tema, recorrencia)
SELECT p.id, s.disciplina_id, s.tema, s.recorrencia
FROM public.profiles p
CROSS JOIN _seed s
WHERE NOT EXISTS (
  SELECT 1 FROM public.topicos t
  WHERE t.user_id = p.id AND t.disciplina_id = s.disciplina_id AND t.tema = s.tema
);

DROP TABLE _seed;
