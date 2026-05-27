import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Checa periodicamente: se passou do horário configurado e o usuário não fez Anki hoje, dispara Notification. */
export function useAnkiLembrete() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let cancelled = false;

    async function checar() {
      if (cancelled) return;
      const hoje = new Date().toISOString().slice(0, 10);
      const flagKey = `anki_lembrete_disparado_${hoje}`;
      if (localStorage.getItem(flagKey)) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("anki_lembrete_ativo, anki_lembrete_horario")
        .eq("id", user!.id)
        .single();

      if (!profile?.anki_lembrete_ativo) return;

      const [hh, mm] = String(profile.anki_lembrete_horario ?? "20:00").split(":").map(Number);
      const agora = new Date();
      const nowMin = agora.getHours() * 60 + agora.getMinutes();
      const targetMin = (hh ?? 20) * 60 + (mm ?? 0);
      if (nowMin < targetMin) return;

      const { data: feito } = await supabase
        .from("anki_revisoes_diarias")
        .select("id")
        .eq("user_id", user!.id)
        .eq("data", hoje)
        .maybeSingle();
      if (feito) return;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
        new Notification("📚 Hora do Anki", {
          body: "Você ainda não revisou os flashcards hoje",
          tag: "anki-lembrete",
        });
        localStorage.setItem(flagKey, "1");
      }
    }

    checar();
    const id = window.setInterval(checar, 5 * 60 * 1000); // a cada 5 min
    return () => { cancelled = true; window.clearInterval(id); };
  }, [user?.id]);
}
