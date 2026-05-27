DELETE FROM public.sessoes_estudo WHERE topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 5 AND modulo IS NULL);
DELETE FROM public.agenda_diaria WHERE topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 5 AND modulo IS NULL);
DELETE FROM public.topico_prerequisitos WHERE topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 5 AND modulo IS NULL) OR prerequisito_topico_id IN (SELECT id FROM public.topicos WHERE disciplina_id = 5 AND modulo IS NULL);
DELETE FROM public.topicos WHERE disciplina_id = 5 AND modulo IS NULL;