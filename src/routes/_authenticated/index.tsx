import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  getTopicosParaHoje, proximaAcao, progressoTopico, pctAcerto, revisaoVencida,
  type Topico, type Disciplina,
} from "@/lib/estudos";
import { calcStreak } from "@/lib/streak";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, Flame, Target, BookOpen, ChevronRight, Sparkles, Timer, AlertCircle,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { PomodoroDialog } from "@/components/PomodoroDialog";
import { AtrasadosCard } from "@/components/AtrasadosCard";
import { AnkiCard } from "@/components/AnkiCard";
import { ensureAgendaHoje } from "@/lib/agenda.functions";
import { useAnkiLembrete } from "@/hooks/use-anki-lembrete";

export const Route = createFileRoute("/_authenticated/")({ component: HojePage });

function HojePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date();
  const diaSemana = hoje.getDay();
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
    ensureFn().then((r) => {
      if (r?.inserted && r.inserted > 0) qc.invalidateQueries({ queryKey: ["agenda-atrasados"] });
    }).catch(() => {});
  }, [user?.id]);

  useAnkiLembrete();



  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").order("id");
      return (data ?? []) as Disciplina[];
    },
  });

  const { data: topicos, isLoading } = useQuery({
    queryKey: ["hoje", user?.id, dataStr],
    queryFn: () => getTopicosParaHoje(user!.id, diaSemana),
    enabled: !!user,
  });

  // Sessões dos últimos 60 dias — alimenta streak + contagem do dia
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

  // Todos os tópicos (para "pendentes reais" = com revisão vencida ou nunca estudados)
  const { data: todosTopicos } = useQuery({
    queryKey: ["todos-topicos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("*");
      return (data ?? []) as Topico[];
    },
    enabled: !!user,
  });

  // Questões registradas HOJE (lendo tópicos com ultima_atividade=hoje seria impreciso; usamos sessoes do tipo "Questões")
  const questoesHoje = sessoes60?.filter((s) => s.data === dataStr && s.tipo_atividade === "Questões").length ?? 0;
  const sessoesHojeCount = sessoes60?.filter((s) => s.data === dataStr).length ?? 0;
  const streak = calcStreak((sessoes60 ?? []).map((s) => s.data));

  // Pendentes reais = revisões vencidas
  const revisoesVencidas = todosTopicos?.filter((t) => revisaoVencida(t) !== null).length ?? 0;

  const concluirSessao = useMutation({
    mutationFn: async ({ topicoId, tipo }: { topicoId: number; tipo: string }) => {
      // upsert idempotente — não duplica
      const { error } = await supabase.from("sessoes_estudo").upsert({
        user_id: user!.id, topico_id: topicoId, tipo_atividade: tipo,
        data: dataStr, concluido: true, concluido_em: new Date().toISOString(),
      }, { onConflict: "user_id,topico_id,data,tipo_atividade" });
      if (error) throw error;
      await supabase.from("topicos").update({ ultima_atividade: new Date().toISOString() }).eq("id", topicoId);
    },
    onSuccess: () => {
      toast.success("Sessão registrada! 🔥");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });

  const metaQuestoes = profile?.meta_diaria_questoes ?? 30;
  const discMap = new Map(disciplinas?.map((d) => [d.id, d]) ?? []);

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

      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Flame} label="Streak" value={`${streak}d`} color="text-orange-500" />
        <StatCard icon={Target} label="Questões" value={`${questoesHoje}/${metaQuestoes}`} color="text-primary" />
        <StatCard icon={CheckCircle2} label="Sessões" value={sessoesHojeCount} color="text-success" />
        <StatCard icon={AlertCircle} label="Revisões" value={revisoesVencidas} color={revisoesVencidas > 0 ? "text-destructive" : "text-muted-foreground"} />
      </div>

      

      <AnkiCard />

      <AtrasadosCard disciplinas={disciplinas ?? []} />



      {revisoesVencidas > 0 && (
        <Link to="/materias">
          <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors">
            <CardContent className="p-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <div className="flex-1 text-sm">
                <span className="font-semibold">{revisoesVencidas} revis{revisoesVencidas === 1 ? "ão vencida" : "ões vencidas"}</span>
                <span className="text-muted-foreground"> — abra Matérias para resolver</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="flex items-center justify-between mt-6">
        <h2 className="text-xl font-display font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Sua missão de hoje
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !topicos || topicos.length === 0 ? (
        <EmptyHoje diaSemana={diaSemana} />
      ) : (
        <div className="space-y-3">
          {topicos.map((t, i) => {
            const d = discMap.get(t.disciplina_id);
            const acao = proximaAcao(t);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <TopicoCard topico={t} disciplina={d} acao={acao}
                  onConcluir={() => concluirSessao.mutate({ topicoId: t.id, tipo: acao })}
                />
              </motion.div>
            );
          })}
        </div>
      )}
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

function TopicoCard({ topico, disciplina, acao, onConcluir }: {
  topico: Topico; disciplina?: Disciplina; acao: string; onConcluir: () => void;
}) {
  const prog = progressoTopico(topico);
  const pct = pctAcerto(topico);
  const rev = revisaoVencida(topico);
  const [pomoOpen, setPomoOpen] = useState(false);
  const qc = useQueryClient();

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: disciplina?.cor ?? "#888" }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary" style={{ backgroundColor: `${disciplina?.cor}22`, color: disciplina?.cor }}>
                {disciplina?.nome}
              </Badge>
              <Badge variant="outline" className="text-xs">{topico.recorrencia}</Badge>
              {rev && (
                <Badge className="text-xs bg-destructive text-destructive-foreground">
                  Revisão {rev} vencida
                </Badge>
              )}
            </div>
            <h3 className="font-semibold leading-tight">{topico.tema}</h3>
            {topico.subtema && <p className="text-xs text-muted-foreground mt-0.5">{topico.subtema}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Próximo: <span className="font-semibold text-foreground">{acao}</span></span>
          {pct !== null && <span>{pct}% acerto · {topico.questoes_feitas}q</span>}
        </div>
        <Progress value={prog} className="h-1.5" />
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onConcluir}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Concluir
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPomoOpen(true)} title="Pomodoro 25min">
            <Timer className="w-4 h-4" />
          </Button>
          <Link to="/materias/$id" params={{ id: String(topico.disciplina_id) }}>
            <Button size="sm" variant="outline"><ChevronRight className="w-4 h-4" /></Button>
          </Link>
        </div>

        <PomodoroDialog
          open={pomoOpen}
          onOpenChange={setPomoOpen}
          titulo={topico.tema}
          subtitulo={disciplina?.nome}
          cor={disciplina?.cor}
          onFocoCompleto={async () => {
            await supabase.from("sessoes_estudo").upsert({
              user_id: topico.user_id, topico_id: topico.id, tipo_atividade: acao,
              data: new Date().toISOString().slice(0, 10), concluido: true,
              concluido_em: new Date().toISOString(),
            }, { onConflict: "user_id,topico_id,data,tipo_atividade" });
            await supabase.from("topicos").update({ ultima_atividade: new Date().toISOString() }).eq("id", topico.id);
            toast.success("Pomodoro completo! Sessão registrada 🎯");
            qc.invalidateQueries();
          }}
        />
      </CardContent>
    </Card>
  );
}

function EmptyHoje({ diaSemana }: { diaSemana: number }) {
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return (
    <Card>
      <CardContent className="p-8 text-center space-y-3">
        <Circle className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="font-semibold">Nada na sua grade para {dias[diaSemana]}</h3>
        <p className="text-sm text-muted-foreground">
          Configure suas disciplinas em "Grade Semanal" ou comece adicionando tópicos em "Matérias".
        </p>
        <div className="flex gap-2 justify-center">
          <Link to="/grade"><Button variant="outline" size="sm">Configurar grade</Button></Link>
          <Link to="/materias"><Button size="sm">Ver matérias</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}
