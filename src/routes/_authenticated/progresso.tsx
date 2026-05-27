import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { progressoTopico, pctAcerto, type Topico, type Disciplina } from "@/lib/estudos";
import { Flame, Target, TrendingUp, BookOpen, Layers } from "lucide-react";
import { subDays, format } from "date-fns";
import { calcAnkiStreak, calcAderenciaMes } from "@/lib/anki";

export const Route = createFileRoute("/_authenticated/progresso")({ component: ProgressoPage });

function ProgressoPage() {
  const { user } = useAuth();
  const { data: topicos } = useQuery({
    queryKey: ["topicos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("*");
      return (data ?? []) as Topico[];
    },
    enabled: !!user,
  });
  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").order("id");
      return (data ?? []) as Disciplina[];
    },
  });
  const { data: sessoes } = useQuery({
    queryKey: ["sessoes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sessoes_estudo").select("*").order("data", { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: !!user,
  });
  const { data: ankiRev } = useQuery({
    queryKey: ["anki-revisoes", user?.id],
    queryFn: async () => {
      const desde = subDays(new Date(), 90).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("anki_revisoes_diarias").select("data")
        .eq("user_id", user!.id).gte("data", desde);
      return (data ?? []).map((r) => r.data as string);
    },
    enabled: !!user,
  });
  const { data: agenda30 } = useQuery({
    queryKey: ["agenda-meta-30d-prog", user?.id],
    queryFn: async () => {
      const desde = subDays(new Date(), 29).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("agenda_diaria")
        .select("data_prevista, status, faz_parte_meta_dia")
        .gte("data_prevista", desde)
        .eq("faz_parte_meta_dia", true);
      return data ?? [];
    },
    enabled: !!user,
  });
  const ankiStreak = calcAnkiStreak(ankiRev ?? []);
  const ankiAderencia = calcAderenciaMes(ankiRev ?? []);

  // Heatmap meta cumprida últimos 30 dias
  const metaPorDia = new Map<string, { meta: number; done: number }>();
  (agenda30 ?? []).forEach((a: any) => {
    const cur = metaPorDia.get(a.data_prevista) ?? { meta: 0, done: 0 };
    cur.meta += 1; if (a.status === "concluido") cur.done += 1;
    metaPorDia.set(a.data_prevista, cur);
  });
  const heatmap = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(new Date(), 29 - i);
    const dStr = d.toISOString().slice(0, 10);
    const v = metaPorDia.get(dStr);
    const cumprida = v && v.meta > 0 && v.done >= v.meta;
    return { dStr, cumprida, label: format(d, "dd/MM") };
  });
  const diasCumpridos = heatmap.filter((h) => h.cumprida).length;

  const totalQuestoes = topicos?.reduce((s, t) => s + t.questoes_feitas, 0) ?? 0;
  const totalAcertos = topicos?.reduce((s, t) => s + t.questoes_acertos, 0) ?? 0;
  const pctGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
  const progGeral = topicos && topicos.length > 0
    ? Math.round(topicos.reduce((s, t) => s + progressoTopico(t), 0) / topicos.length) : 0;

  const porDisc = disciplinas?.map((d) => {
    const ts = topicos?.filter((t) => t.disciplina_id === d.id) ?? [];
    const q = ts.reduce((s, t) => s + t.questoes_feitas, 0);
    const a = ts.reduce((s, t) => s + t.questoes_acertos, 0);
    return {
      nome: d.nome.split(" ")[0],
      cor: d.cor,
      progresso: ts.length > 0 ? Math.round(ts.reduce((s, t) => s + progressoTopico(t), 0) / ts.length) : 0,
      acerto: q > 0 ? Math.round((a / q) * 100) : 0,
      questoes: q,
    };
  }) ?? [];

  const ultimos7 = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dStr = d.toISOString().slice(0, 10);
    const count = sessoes?.filter((s) => s.data === dStr).length ?? 0;
    return { dia: format(d, "EEEEEE"), sessoes: count };
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-display font-bold">Progresso</h1>

      <div className="grid grid-cols-2 gap-3">
        <KPI icon={TrendingUp} label="Progresso geral" value={`${progGeral}%`} color="text-primary" />
        <KPI icon={Target} label="% acerto" value={`${pctGeral}%`} color="text-success" />
        <KPI icon={BookOpen} label="Questões" value={totalQuestoes} color="text-warning" />
        <KPI icon={Flame} label="Sessões (7d)" value={ultimos7.reduce((s, d) => s + d.sessoes, 0)} color="text-orange-500" />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm">
            <div className="font-semibold">
              Anki: {ankiStreak} {ankiStreak === 1 ? "dia seguido" : "dias seguidos"} <Flame className="w-4 h-4 inline text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground">{ankiAderencia}% de aderência este mês</div>
          </div>
        </CardContent>
      </Card>



      <Card>
        <CardHeader><CardTitle className="text-base">Atividade — últimos 7 dias</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ultimos7}>
              <XAxis dataKey="dia" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="sessoes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Progresso por disciplina</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {porDisc.map((d) => (
            <div key={d.nome}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{d.nome}</span>
                <span className="text-muted-foreground">{d.progresso}% · {d.acerto}% acerto · {d.questoes}q</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${d.progresso}%`, backgroundColor: d.cor }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className="text-2xl font-bold mt-2">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
