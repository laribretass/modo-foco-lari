import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Cron diário (5h BRT / 8h UTC) — popula agenda_diaria do dia
 * para todos os usuários que têm grade_semanal definida.
 * Chamado por pg_cron via net.http_post com apikey.
 */
export const Route = createFileRoute("/api/public/cron/popular-agendas")({
  server: {
    handlers: {
      POST: async () => {
        const hoje = new Date().toISOString().slice(0, 10);

        const { data: users, error: uErr } = await supabaseAdmin
          .from("grade_semanal")
          .select("user_id");
        if (uErr) {
          return new Response(JSON.stringify({ error: uErr.message }), { status: 500 });
        }

        const unique = Array.from(new Set((users ?? []).map((u: any) => u.user_id)));
        let totalInserted = 0;
        const erros: string[] = [];

        for (const uid of unique) {
          const { data, error } = await supabaseAdmin.rpc("popular_agenda_dia", {
            p_user: uid, p_data: hoje,
          });
          if (error) erros.push(`${uid}: ${error.message}`);
          else totalInserted += data ?? 0;
        }

        return new Response(
          JSON.stringify({ ok: true, users: unique.length, inserted: totalInserted, erros }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST to run" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
