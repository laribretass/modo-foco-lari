DELETE FROM public.sessoes_estudo WHERE topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 6 AND modulo IS NULL);
DELETE FROM public.agenda_diaria WHERE topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 6 AND modulo IS NULL);
DELETE FROM public.topico_prerequisitos WHERE topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 6 AND modulo IS NULL) OR prerequisito_topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 6 AND modulo IS NULL);
DELETE FROM public.topicos WHERE disciplina_id = 6 AND modulo IS NULL;

INSERT INTO public.topicos (user_id, disciplina_id, tema, modulo, ordem_didatica, recorrencia)
SELECT v.user_id, v.disciplina_id, v.tema, v.modulo, v.ordem_didatica, v.recorrencia
FROM profiles p
CROSS JOIN LATERAL (VALUES
  (p.id, 6, 'A01 • 1. Movimento Uniforme', 'Bloco01 • 1. Cinemática', 1, 'Média'),
  (p.id, 6, 'A02 • 2. Movimento Uniformemente Variado', 'Bloco01 • 1. Cinemática', 2, 'Média'),
  (p.id, 6, 'A03 • 3. Queda Livre e Lançamento Vertical', 'Bloco01 • 1. Cinemática', 3, 'Média'),
  (p.id, 6, 'A04 • 4. Composição de Movimentos', 'Bloco01 • 1. Cinemática', 4, 'Média'),
  (p.id, 6, 'A05 • 5. Movimento Circular Uniforme', 'Bloco01 • 1. Cinemática', 5, 'Média'),
  (p.id, 6, 'A06 • 1. Fundamentos da Óptica Geométrica', 'Bloco02 • 2. Óptica Geométrica', 6, 'Média'),
  (p.id, 6, 'A07 • 2. Reflexão da Luz e Espelhos Planos', 'Bloco02 • 2. Óptica Geométrica', 7, 'Média'),
  (p.id, 6, 'A08 • 3. Espelhos Esféricos', 'Bloco02 • 2. Óptica Geométrica', 8, 'Média'),
  (p.id, 6, 'A09 • 4. Refração da Luz', 'Bloco02 • 2. Óptica Geométrica', 9, 'Média'),
  (p.id, 6, 'A10 • 5. Lentes Esféricas', 'Bloco02 • 2. Óptica Geométrica', 10, 'Média'),
  (p.id, 6, 'A11 • 6. Instrumentos Ópticos', 'Bloco02 • 2. Óptica Geométrica', 11, 'Média'),
  (p.id, 6, 'A12 • 1. Eletrização', 'Bloco03 • 3. Eletrostática', 12, 'Média'),
  (p.id, 6, 'A13 • 2. Força Elétrica', 'Bloco03 • 3. Eletrostática', 13, 'Média'),
  (p.id, 6, 'A14 • 3. Campo Elétrico', 'Bloco03 • 3. Eletrostática', 14, 'Média'),
  (p.id, 6, 'A15 • 4. Potencial Elétrico', 'Bloco03 • 3. Eletrostática', 15, 'Média'),
  (p.id, 6, 'A16 • 5. Condutores Elétricos', 'Bloco03 • 3. Eletrostática', 16, 'Média'),
  (p.id, 6, 'A17 • 1. Leis de Newton', 'Bloco04 • 4. Dinâmica', 17, 'Média'),
  (p.id, 6, 'A18 • 2. Sistema de Corpos', 'Bloco04 • 4. Dinâmica', 18, 'Média'),
  (p.id, 6, 'A19 • 3. Força de Atrito', 'Bloco04 • 4. Dinâmica', 19, 'Média'),
  (p.id, 6, 'A20 • 4. Dinâmica no MCU', 'Bloco04 • 4. Dinâmica', 20, 'Média'),
  (p.id, 6, 'A21 • 5. Trabalho e Energia', 'Bloco04 • 4. Dinâmica', 21, 'Média'),
  (p.id, 6, 'A22 • 6. Quantidade de Movimento', 'Bloco04 • 4. Dinâmica', 22, 'Média'),
  (p.id, 6, 'A23 • 7. Gravitação', 'Bloco04 • 4. Dinâmica', 23, 'Média'),
  (p.id, 6, 'A24 • 1. Movimento Harmônico Simples', 'Bloco05 • 5. Ondulatória', 24, 'Média'),
  (p.id, 6, 'A25 • 2. Introdução à Ondulatória', 'Bloco05 • 5. Ondulatória', 25, 'Média'),
  (p.id, 6, 'A26 • 3. Fenômenos Ondulatórios', 'Bloco05 • 5. Ondulatória', 26, 'Média'),
  (p.id, 6, 'A27 • 4. Ondas Estacionárias', 'Bloco05 • 5. Ondulatória', 27, 'Média'),
  (p.id, 6, 'A28 • 1. Corrente Elétrica', 'Bloco06 • 6. Eletrodinâmica', 28, 'Média'),
  (p.id, 6, 'A29 • 2. Resistores', 'Bloco06 • 6. Eletrodinâmica', 29, 'Média'),
  (p.id, 6, 'A30 • 3. Potência Elétrica', 'Bloco06 • 6. Eletrodinâmica', 30, 'Média'),
  (p.id, 6, 'A31 • 4. Associação de Resistores', 'Bloco06 • 6. Eletrodinâmica', 31, 'Média'),
  (p.id, 6, 'A32 • 5. Instrumentos de Medidas Elétricas', 'Bloco06 • 6. Eletrodinâmica', 32, 'Média'),
  (p.id, 6, 'A33 • 6. Geradores e Receptores Elétricos', 'Bloco06 • 6. Eletrodinâmica', 33, 'Média'),
  (p.id, 6, 'A34 • 7. Capacitores', 'Bloco06 • 6. Eletrodinâmica', 34, 'Média'),
  (p.id, 6, 'A35 • 1. Termometria', 'Bloco07 • 7. Termologia', 35, 'Média'),
  (p.id, 6, 'A36 • 2. Dilatometria', 'Bloco07 • 7. Termologia', 36, 'Média'),
  (p.id, 6, 'A37 • 3. Propagação de Calor', 'Bloco07 • 7. Termologia', 37, 'Média'),
  (p.id, 6, 'A38 • 4. Calorimetria', 'Bloco07 • 7. Termologia', 38, 'Média'),
  (p.id, 6, 'A39 • 5. Gases e 1ª Lei da Termodinâmica', 'Bloco07 • 7. Termologia', 39, 'Média'),
  (p.id, 6, 'A40 • 6. Gases e 2ª Lei da Termodinâmica', 'Bloco07 • 7. Termologia', 40, 'Média'),
  (p.id, 6, 'A41 • 1. Campo Magnético', 'Bloco08 • 8. Eletromagnetismo', 41, 'Média'),
  (p.id, 6, 'A42 • 2. Força Magnética', 'Bloco08 • 8. Eletromagnetismo', 42, 'Média'),
  (p.id, 6, 'A43 • 3. Indução Eletromagnética', 'Bloco08 • 8. Eletromagnetismo', 43, 'Média'),
  (p.id, 6, 'A44 • 1. Corpos Extensos', 'Bloco09 • 9. Estática e Hidrostática', 44, 'Média'),
  (p.id, 6, 'A45 • 2. Hidrostática', 'Bloco09 • 9. Estática e Hidrostática', 45, 'Média'),
  (p.id, 6, 'A46 • 1. Revisão de Cinemática', 'Bloco10 • 10. Revisão Geral', 46, 'Média'),
  (p.id, 6, 'A47 • 2. Revisão de Dinâmica', 'Bloco10 • 10. Revisão Geral', 47, 'Média'),
  (p.id, 6, 'A48 • 3. Revisão de Eletricidade', 'Bloco10 • 10. Revisão Geral', 48, 'Média'),
  (p.id, 6, 'A49 • 4. Revisão de Ondulatória e Óptica', 'Bloco10 • 10. Revisão Geral', 49, 'Média'),
  (p.id, 6, 'A50 • 5. Revisão de Termologia', 'Bloco10 • 10. Revisão Geral', 50, 'Média'),
  (p.id, 6, 'A51 • 6. Revisão Geral Final', 'Bloco10 • 10. Revisão Geral', 51, 'Média')
) AS v(user_id, disciplina_id, tema, modulo, ordem_didatica, recorrencia)
WHERE NOT EXISTS (
  SELECT 1 FROM public.topicos t
  WHERE t.user_id = p.id AND t.disciplina_id = 6 AND t.tema = v.tema
);