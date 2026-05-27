import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { type Disciplina, type Topico, revisaoVencida } from "@/lib/estudos";
import { calcStreak } from "@/lib/streak";

import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, Flame, Target, AlertCircle,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { AtrasadosCard } from "@/components/AtrasadosCard";
import { AnkiCard } from "@/components/AnkiCard";
import { RepertorioCard } from "@/components/RepertorioCard";
import { PlanoDoDia } from "@/components/PlanoDoDia";
import { CorridaProEnemCard } from "@/components/CorridaProEnemCard";
import { AlertasEstrategicos } from "@/components/AlertasEstrategicos";
import { ensureAgendaHoje } from "@/lib/agenda.functions";
import { useAnkiLembrete } from "@/hooks/use-anki-lembrete";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/")({ component: HojePage });

function HojePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date();
  const dataStr = hoje.toISOString().slice(0, 10);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const ensureFn = useServerFn(ensureAgendaHoje);
  useEffect(() => {
    if (!user) return;
    ensureFn().then(() => {
      qc.invalidateQueries({ queryKey: ["plano-dia"] });
      qc.invalidateQueries({ queryKey: ["agenda-atrasados"] });
    }).catch(() => {});
  }, [user?.id, profile?.meta_topicos_dia]);

  useAnkiLembrete();

  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").order("id");
      return (data ?? []) as Disciplina[];
    },
  });

  const { data: sessoes60 } = useQuery({
    queryKey: ["sessoes-60d", user?.id, dataStr],
    queryFn: async () => {
      const desde = subDays(new Date(), 60).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("sessoes_estudo").select("data, topico_id, tipo_atividade")
        .gte("data", desde).eq("concluido", true);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: todosTopicos } = useQuery({
    queryKey: ["todos-topicos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("*");
      return (data ?? []) as Topico[];
    },
    enabled: !!user,
  });

  const questoesHoje = sessoes60?.filter((s) => s.data === dataStr && s.tipo_atividade === "Questões").length ?? 0;
  const sessoesHojeCount = sessoes60?.filter((s) => s.data === dataStr).length ?? 0;
  const streak = calcStreak((sessoes60 ?? []).map((s) => s.data));
  const revisoesVencidas = todosTopicos?.filter((t) => revisaoVencida(t) !== null).length ?? 0;
  const metaQuestoes = profile?.meta_diaria_questoes ?? 30;
  const metaTopicos = (profile as any)?.meta_topicos_dia ?? 4;

  return (
    <div className="p-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground capitalize">
          {format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-3xl font-display font-bold mt-1">
          Olá, {profile?.nome ?? "estudante"} 👋
        </h1>
      </motion.div>

      <AlertasEstrategicos />
      <CorridaProEnemCard />

      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Flame} label="Streak" value={`${streak}d`} color="text-orange-500" />
        <StatCard icon={Target} label="Questões" value={`${questoesHoje}/${metaQuestoes}`} color="text-primary" />
        <StatCard icon={CheckCircle2} label="Sessões" value={sessoesHojeCount} color="text-success" />
        <StatCard icon={AlertCircle} label="Revisões" value={revisoesVencidas} color={revisoesVencidas > 0 ? "text-destructive" : "text-muted-foreground"} />
      </div>

      <AnkiCard />
      <RepertorioCard />

      <PlanoDoDia disciplinas={disciplinas ?? []} meta={metaTopicos} />

      <AtrasadosCard disciplinas={disciplinas ?? []} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col items-center text-center">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className="text-xl font-bold mt-1 tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );
}
