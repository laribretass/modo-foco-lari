import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Gera um briefing matinal personalizado usando Lovable AI (Gemini 2.5 Flash).
 * Roda no servidor para proteger LOVABLE_API_KEY.
 */
export const getBriefingDoDia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Coleta contexto: tópicos + sessões últimos 7 dias
    const [{ data: topicos }, { data: sessoes }, { data: disciplinas }] = await Promise.all([
      supabase.from("topicos").select("disciplina_id, tema, recorrencia, questoes_feitas, questoes_acertos, teoria_feita, revisao1_agendada_para, revisao2_agendada_para, revisao1_feita, revisao2_feita"),
      supabase.from("sessoes_estudo").select("data, tipo_atividade, topico_id").order("data", { ascending: false }).limit(80),
      supabase.from("disciplinas").select("id, nome"),
    ]);

    const hoje = new Date().toISOString().slice(0, 10);
    const discMap = new Map((disciplinas ?? []).map((d: any) => [d.id, d.nome]));

    // resumo por disciplina
    const porDisc = new Map<string, { feitas: number; acertos: number; revisoesVencidas: number }>();
    (topicos ?? []).forEach((t: any) => {
      const nome = discMap.get(t.disciplina_id) ?? "?";
      const cur = porDisc.get(nome) ?? { feitas: 0, acertos: 0, revisoesVencidas: 0 };
      cur.feitas += t.questoes_feitas ?? 0;
      cur.acertos += t.questoes_acertos ?? 0;
      if (t.revisao1_agendada_para && !t.revisao1_feita && t.revisao1_agendada_para <= hoje) cur.revisoesVencidas++;
      if (t.revisao2_agendada_para && !t.revisao2_feita && t.revisao2_agendada_para <= hoje) cur.revisoesVencidas++;
      porDisc.set(nome, cur);
    });

    const stats = Array.from(porDisc.entries()).map(([nome, v]) => ({
      nome,
      questoes: v.feitas,
      pctAcerto: v.feitas > 0 ? Math.round((v.acertos / v.feitas) * 100) : null,
      revisoesVencidas: v.revisoesVencidas,
    }));

    const sessoes7d = (sessoes ?? []).filter((s: any) => {
      const diff = (Date.now() - new Date(s.data).getTime()) / 86400000;
      return diff <= 7;
    }).length;

    const prompt = `Você é um coach de estudos ENEM direto e motivador. Em PORTUGUÊS, NO MÁXIMO 3 FRASES CURTAS, gere um briefing matinal para o estudante com base nos dados abaixo. Cite 1 disciplina concreta para priorizar hoje (a com pior % de acerto, ou com revisões vencidas). Seja humano, sem clichês, sem emojis em excesso (1 no máximo). NÃO use listas, nem markdown.

Dados:
- Sessões últimos 7 dias: ${sessoes7d}
- Por disciplina: ${JSON.stringify(stats)}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("AI gateway error:", res.status, txt);
        return { briefing: null, error: res.status === 429 ? "Limite de IA atingido. Tente em alguns instantes." : "Não foi possível gerar o briefing agora." };
      }

      const json = await res.json();
      const briefing = json.choices?.[0]?.message?.content?.trim() ?? null;
      return { briefing, error: null };
    } catch (e: any) {
      console.error("Briefing error:", e);
      return { briefing: null, error: "Falha ao conectar à IA." };
    }
  });
