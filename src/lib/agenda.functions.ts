import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Garante que a agenda do dia exista para o usuário (fallback ao cron). */
export const ensureAgendaHoje = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc("popular_agenda_dia", {
      p_user: userId,
      p_data: hoje,
    });
    if (error) return { inserted: 0, error: error.message };
    return { inserted: data ?? 0, error: null };
  });
