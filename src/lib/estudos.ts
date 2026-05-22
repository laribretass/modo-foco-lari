import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export type Topico = {
  id: number;
  user_id: string;
  disciplina_id: number;
  tema: string;
  subtema: string | null;
  recorrencia: string;
  pre_aula_feita: boolean;
  pre_aula_acertos: number;
  teoria_feita: boolean;
  teoria_data: string | null;
  mapeamento_feito: boolean;
  mapeamento_data: string | null;
  questoes_feitas: number;
  questoes_acertos: number;
  revisao1_feita: boolean;
  revisao1_acertos: number;
  revisao1_data: string | null;
  revisao1_agendada_para: string | null;
  revisao2_feita: boolean;
  revisao2_acertos: number;
  revisao2_data: string | null;
  revisao2_agendada_para: string | null;
  flashcards_feitos: boolean;
  observacoes: string | null;
  ultima_atividade: string;
};

export type Disciplina = {
  id: number; nome: string; area: string; cor: string; icone: string | null;
};

/** Retorna 1 ou 2 se há revisão vencida (data agendada <= hoje), senão null. */
export function revisaoVencida(t: Pick<Topico, "revisao1_agendada_para" | "revisao1_feita" | "revisao2_agendada_para" | "revisao2_feita">): 1 | 2 | null {
  const hoje = new Date().toISOString().slice(0, 10);
  if (t.revisao1_agendada_para && !t.revisao1_feita && t.revisao1_agendada_para <= hoje) return 1;
  if (t.revisao2_agendada_para && !t.revisao2_feita && t.revisao2_agendada_para <= hoje) return 2;
  return null;
}

export type ProximaAcao =
  | "Pré-aula" | "Teoria" | "Mapeamento" | "Questões"
  | "Revisão 1" | "Revisão 2" | "Flashcards" | "Concluído";

export function proximaAcao(t: Topico): ProximaAcao {
  if (!t.pre_aula_feita) return "Pré-aula";
  if (!t.teoria_feita) return "Teoria";
  if (!t.mapeamento_feito) return "Mapeamento";
  if (t.questoes_feitas < 10) return "Questões";
  if (!t.revisao1_feita) return "Revisão 1";
  if (!t.revisao2_feita) return "Revisão 2";
  if (!t.flashcards_feitos) return "Flashcards";
  return "Concluído";
}

export function progressoTopico(t: Topico): number {
  let p = 0;
  if (t.pre_aula_feita) p += 14;
  if (t.teoria_feita) p += 14;
  if (t.mapeamento_feito) p += 14;
  if (t.questoes_feitas >= 10) p += 14;
  if (t.revisao1_feita) p += 14;
  if (t.revisao2_feita) p += 14;
  if (t.flashcards_feitos) p += 16;
  return Math.min(p, 100);
}

export function pctAcerto(t: Topico): number | null {
  if (t.questoes_feitas === 0) return null;
  return Math.round((t.questoes_acertos / t.questoes_feitas) * 100);
}

export function scoreRecorrencia(r: string): number {
  if (r === "Alta") return 30;
  if (r === "Média") return 20;
  return 10;
}

export function scoreEstado(t: Topico): number {
  const a = proximaAcao(t);
  return ({
    "Pré-aula": 50, "Teoria": 40, "Mapeamento": 35, "Questões": 30,
    "Revisão 1": 25, "Revisão 2": 20, "Flashcards": 15, "Concluído": 0,
  } as const)[a];
}

export function scoreTopico(t: Topico, jaEstudadoHoje: boolean): number {
  let s = scoreRecorrencia(t.recorrencia) + scoreEstado(t);
  const dias = differenceInDays(new Date(), new Date(t.ultima_atividade));
  s += Math.min(dias * 2, 20);
  const pct = pctAcerto(t);
  if (pct !== null && pct < 60) s += 15;
  if (jaEstudadoHoje) s -= 100;
  return s;
}

export async function getTopicosParaHoje(userId: string, diaSemana: number) {
  const { data: grade } = await supabase
    .from("grade_semanal")
    .select("disciplina_id, ordem")
    .eq("user_id", userId)
    .eq("dia_semana", diaSemana)
    .order("ordem");

  const disciplinasHoje = grade?.map((g) => g.disciplina_id) ?? [];
  if (disciplinasHoje.length === 0) return [];

  const { data: topicos } = await supabase
    .from("topicos")
    .select("*")
    .in("disciplina_id", disciplinasHoje);

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: sessoes } = await supabase
    .from("sessoes_estudo")
    .select("topico_id")
    .eq("data", hoje)
    .eq("concluido", true);

  const estudadosHoje = new Set(sessoes?.map((s) => s.topico_id) ?? []);

  const ranked = (topicos ?? [])
    .filter((t) => proximaAcao(t as Topico) !== "Concluído")
    .map((t) => ({ t: t as Topico, score: scoreTopico(t as Topico, estudadosHoje.has(t.id)) }))
    .sort((a, b) => b.score - a.score);

  // Group by discipline, take top 2 per discipline, respect ordem
  const byDisc = new Map<number, typeof ranked>();
  ranked.forEach((r) => {
    const list = byDisc.get(r.t.disciplina_id) ?? [];
    if (list.length < 2) { list.push(r); byDisc.set(r.t.disciplina_id, list); }
  });

  return disciplinasHoje.flatMap((id) => byDisc.get(id) ?? []).map((r) => r.t);
}
