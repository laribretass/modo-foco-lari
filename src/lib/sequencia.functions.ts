import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Popula pré-requisitos do user baseado no catálogo global de sequência didática. */
export const popularPrerequisitos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("popular_prerequisitos_user", {
      p_user_id: userId,
    });
    if (error) return { inseridos: 0, error: error.message };
    return { inseridos: (data ?? 0) as number, error: null };
  });
