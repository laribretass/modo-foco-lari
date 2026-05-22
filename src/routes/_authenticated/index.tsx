import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getTopicosParaHoje, proximaAcao, progressoTopico, pctAcerto, type Topico, type Disciplina } from "@/lib/estudos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Flame, Target, BookOpen, ChevronRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

  const { data: sessoesHoje } = useQuery({
    queryKey: ["sessoes-hoje", user?.id, dataStr],
    queryFn: async () => {
      const { data } = await supabase.from("sessoes_estudo").select("*").eq("data", dataStr);
      return data ?? [];
    },
    enabled: !!user,
  });

  const concluirSessao = useMutation({
    mutationFn: async ({ topicoId, tipo }: { topicoId: number; tipo: string }) => {
      const { error } = await supabase.from("sessoes_estudo").insert({
        user_id: user!.id, topico_id: topicoId, tipo_atividade: tipo,
        data: dataStr, concluido: true, concluido_em: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from("topicos").update({ ultima_atividade: new Date().toISOString() }).eq("id", topicoId);
    },
    onSuccess: () => {
      toast.success("Sessão registrada! 🔥");
      qc.invalidateQueries({ queryKey: ["hoje"] });
      qc.invalidateQueries({ queryKey: ["sessoes-hoje"] });
    },
  });

  const sessoesConcluidas = sessoesHoje?.length ?? 0;
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

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Flame} label="Sessões" value={sessoesConcluidas} color="text-orange-500" />
        <StatCard icon={Target} label="Meta diária" value={`${metaQuestoes}q`} color="text-primary" />
        <StatCard icon={BookOpen} label="Pendentes" value={topicos?.length ?? 0} color="text-success" />
      </div>

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
        <div className="text-2xl font-bold mt-1">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function TopicoCard({ topico, disciplina, acao, onConcluir }: {
  topico: Topico; disciplina?: Disciplina; acao: string; onConcluir: () => void;
}) {
  const prog = progressoTopico(topico);
  const pct = pctAcerto(topico);
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: disciplina?.cor ?? "#888" }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" style={{ backgroundColor: `${disciplina?.cor}22`, color: disciplina?.cor }}>
                {disciplina?.nome}
              </Badge>
              <Badge variant="outline" className="text-xs">{topico.recorrencia}</Badge>
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
            <CheckCircle2 className="w-4 h-4 mr-1" /> Concluir {acao}
          </Button>
          <Link to="/materias/$id" params={{ id: String(topico.disciplina_id) }}>
            <Button size="sm" variant="outline"><ChevronRight className="w-4 h-4" /></Button>
          </Link>
        </div>
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
