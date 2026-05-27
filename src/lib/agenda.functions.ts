import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Garante que o plano do dia exista (popula agenda + completa até a meta do usuário). */
export const ensureAgendaHoje = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const hoje = new Date().toISOString().slice(0, 10);

    // 1) Popula geral (mantém compat com cron)
    await supabase.rpc("popular_agenda_dia", { p_user: userId, p_data: hoje });

    // 2) Garante plano fechado de N tópicos (meta diária)
    const { error } = await supabase.rpc("garantir_plano_dia", { p_user_id: userId });
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  });

/** Adiciona +1 tópico extra (além da meta) e retorna o ID escolhido. */
export const adicionarTopicoExtra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("adicionar_topico_extra", { p_user_id: userId });
    if (error) return { topicoId: null as number | null, error: error.message };
    return { topicoId: (data ?? null) as number | null, error: null };
  });
