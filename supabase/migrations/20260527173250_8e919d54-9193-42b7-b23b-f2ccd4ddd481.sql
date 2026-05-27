
WITH deleted_topicos AS (
  DELETE FROM public.topicos WHERE disciplina_id = 8 RETURNING id
),
del_sessoes AS (
  DELETE FROM public.sessoes_estudo WHERE topico_id IN (SELECT id FROM deleted_topicos) RETURNING 1
),
del_agenda AS (
  DELETE FROM public.agenda_diaria WHERE topico_id IN (SELECT id FROM deleted_topicos) OR disciplina_id = 8 RETURNING 1
),
del_prereq AS (
  DELETE FROM public.topico_prerequisitos WHERE topico_id IN (SELECT id FROM deleted_topicos) OR prerequisito_topico_id IN (SELECT id FROM deleted_topicos) RETURNING 1
)
SELECT 1;

INSERT INTO public.topicos (user_id, disciplina_id, tema, modulo, ordem_didatica, recorrencia)
SELECT u.id, 8, t.tema, t.modulo, t.ordem, 'Média'
FROM auth.users u
CROSS JOIN (VALUES
  (1,'1. História Geral','A1 – Historiografia e Povos Ágrafos'),
  (2,'1. História Geral','A2 – Antiguidade Oriental'),
  (3,'1. História Geral','A3 – Atenas e Grécia'),
  (4,'1. História Geral','A4 – Roma Antiga'),
  (5,'1. História Geral','A5 – Idade Média'),
  (6,'1. História Geral','A6 – Formação dos Estados Nacionais'),
  (7,'1. História Geral','A7 – Absolutismo'),
  (8,'1. História Geral','A8 – Mercantilismo'),
  (9,'1. História Geral','A9 – Renascimento'),
  (10,'1. História Geral','A10 – Reforma Protestante e Contrarreforma'),
  (11,'1. História Geral','A11 – Revoluções Inglesas'),
  (12,'1. História Geral','A12 – Iluminismo e Liberalismo'),
  (13,'1. História Geral','A13 – Revolução Francesa'),
  (14,'1. História Geral','A14 – Era Napoleônica e Congresso de Viena'),
  (15,'1. História Geral','A15 – Revoluções Liberais'),
  (16,'1. História Geral','A16 – Revolução Industrial'),
  (17,'1. História Geral','A17 – Ideias Sociais e Políticas do Século XIX e Movimento Operário'),
  (18,'1. História Geral','A18 – Unificações Italiana e Alemã'),
  (19,'1. História Geral','A19 – Imperialismo'),
  (20,'1. História Geral','A20 – Primeira Guerra Mundial'),
  (21,'1. História Geral','A21 – Revolução Russa'),
  (22,'1. História Geral','A22 – Grande Depressão'),
  (23,'1. História Geral','A23 – Nazifascismo'),
  (24,'1. História Geral','A24 – Segunda Guerra Mundial'),
  (25,'1. História Geral','A25 – Guerra Fria e Terrorismo'),
  (26,'1. História Geral','A26 – Descolonização Afroasiática'),
  (27,'2. História do Brasil','A1 – Expansão Marítima'),
  (28,'2. História do Brasil','A2 – Povos Africanos'),
  (29,'2. História do Brasil','A3 – Capitanias e Administração Colonial'),
  (30,'2. História do Brasil','A4 – Economia Açucareira'),
  (31,'2. História do Brasil','A5 – Atividades Econômicas'),
  (32,'2. História do Brasil','A6 – Invasões Estrangeiras'),
  (33,'2. História do Brasil','A7 – Economia e Sociedade Mineradora'),
  (34,'2. História do Brasil','A8 – Tratados e Limites - Sociedade Colonial'),
  (35,'2. História do Brasil','A9 – Administração Pombalina'),
  (36,'2. História do Brasil','A10 – Revoltas Separatistas e Nativistas'),
  (37,'2. História do Brasil','A11 – Período Joanino'),
  (38,'2. História do Brasil','A12 – Primeiro Reinado'),
  (39,'2. História do Brasil','A13 – Período Regencial'),
  (40,'2. História do Brasil','A14 – Segundo Reinado'),
  (41,'2. História do Brasil','A15 – Primeira República'),
  (42,'2. História do Brasil','A16 – República Oligárquica'),
  (43,'2. História do Brasil','A17 – Era Vargas'),
  (44,'2. História do Brasil','A18 – República Democrática (1945-1964)'),
  (45,'2. História do Brasil','A19 – Ditadura Civil-militar de 1964'),
  (46,'2. História do Brasil','A20 – Nova República'),
  (47,'3. História das Américas','A1 – Povos Ameríndios'),
  (48,'3. História das Américas','A2 – América Espanhola'),
  (49,'3. História das Américas','A3 – Revolução Americana'),
  (50,'3. História das Américas','A4 – Independência da América Espanhola'),
  (51,'3. História das Américas','A5 – Estados Unidos Durante o Século XIX'),
  (52,'3. História das Américas','A6 – Revolução Mexicana'),
  (53,'3. História das Américas','A7 – Revolução Cubana')
) AS t(ordem, modulo, tema);
