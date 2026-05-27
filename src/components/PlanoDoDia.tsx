import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, ClipboardList, Plus, ChevronRight, Timer, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Disciplina, Topico } from "@/lib/estudos";
import { proximaAcao } from "@/lib/estudos";
import { adicionarTopicoExtra } from "@/lib/agenda.functions";
import { PomodoroDialog } from "@/components/PomodoroDialog";
import { VitoriaDialog } from "@/components/VitoriaDialog";
import { calcStreakMeta } from "@/lib/streak";

type AgendaItem = {
  id: number;
  user_id: string;
  topico_id: number;
  disciplina_id: number;
  data_prevista: string;
  proxima_acao: string;
  status: string;
  faz_parte_meta_dia: boolean;
};

export function PlanoDoDia({
  disciplinas, meta,
}: { disciplinas: Disciplina[]; meta: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const [vitoriaOpen, setVitoriaOpen] = useState(false);
  const [vitoriaJaMostrada, setVitoriaJaMostrada] = useState(false);

  const addExtra = useServerFn(adicionarTopicoExtra);

  const { data: agenda, isLoading } = useQuery({
    queryKey: ["plano-dia", user?.id, hoje],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_diaria")
        .select("*, topicos!inner(concluido_em)")
        .eq("data_prevista", hoje)
        .is("topicos.concluido_em", null)
        .order("id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgendaItem[];
    },
    enabled: !!user,
  });

  const topicoIds = useMemo(
    () => Array.from(new Set((agenda ?? []).map((a) => a.topico_id))),
    [agenda],
  );

  const { data: topicos } = useQuery({
    queryKey: ["plano-topicos", topicoIds],
    queryFn: async () => {
      if (topicoIds.length === 0) return [];
      const { data } = await supabase.from("topicos").select("*").in("id", topicoIds);
      return (data ?? []) as Topico[];
    },
    enabled: topicoIds.length > 0,
  });

  // Streak considerando META (últimos 30d)
  const { data: agendaHist } = useQuery({
    queryKey: ["agenda-meta-30d", user?.id, hoje],
    queryFn: async () => {
      const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("agenda_diaria")
        .select("data_prevista, status, faz_parte_meta_dia")
        .gte("data_prevista", desde)
        .eq("faz_parte_meta_dia", true);
      return data ?? [];
    },
    enabled: !!user,
  });

  const streakMeta = useMemo(() => {
    const map = new Map<string, { meta: number; done: number }>();
    (agendaHist ?? []).forEach((a: any) => {
      const dia = a.data_prevista as string;
      const cur = map.get(dia) ?? { meta: 0, done: 0 };
      cur.meta += 1;
      if (a.status === "concluido") cur.done += 1;
      map.set(dia, cur);
    });
    return calcStreakMeta(map);
  }, [agendaHist]);

  const concluirItem = useMutation({
    mutationFn: async (item: AgendaItem) => {
      // Marca agenda como concluído + registra sessão
      const now = new Date().toISOString();
      const { error: e1 } = await supabase.from("agenda_diaria")
        .update({ status: "concluido", concluido_em: now })
        .eq("id", item.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("sessoes_estudo").upsert({
        user_id: user!.id, topico_id: item.topico_id, tipo_atividade: item.proxima_acao,
        data: hoje, concluido: true, concluido_em: now,
      }, { onConflict: "user_id,topico_id,data,tipo_atividade" });
      if (e2) throw e2;
      await supabase.from("topicos").update({ ultima_atividade: now }).eq("id", item.topico_id);
    },
    onSuccess: () => {
      toast.success("Tópico concluído! ✨");
      qc.invalidateQueries({ queryKey: ["plano-dia"] });
      qc.invalidateQueries({ queryKey: ["agenda-meta-30d"] });
      qc.invalidateQueries({ queryKey: ["sessoes-60d"] });
      qc.invalidateQueries({ queryKey: ["todos-topicos"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const addExtraMut = useMutation({
    mutationFn: async () => {
      const r = await addExtra();
      if (r.error) throw new Error(r.error);
      if (!r.topicoId) throw new Error("Sem tópicos disponíveis hoje");
      return r;
    },
    onSuccess: () => {
      toast.success("+1 tópico extra adicionado");
      qc.invalidateQueries({ queryKey: ["plano-dia"] });
    },
    onError: (e: any) => toast.info(e.message ?? "Nada disponível"),
  });

  const plano = (agenda ?? []).filter((a) => a.faz_parte_meta_dia);
  const extras = (agenda ?? []).filter((a) => !a.faz_parte_meta_dia);
  const concluidosMeta = plano.filter((a) => a.status === "concluido").length;
  const totalMeta = plano.length || meta;
  const pct = totalMeta > 0 ? Math.round((concluidosMeta / totalMeta) * 100) : 0;
  const completo = totalMeta > 0 && concluidosMeta >= totalMeta;

  // Dispara modal de vitória 1x ao completar
  useEffect(() => {
    if (completo && !vitoriaJaMostrada && !isLoading) {
      setVitoriaOpen(true);
      setVitoriaJaMostrada(true);
      // vibração se mobile
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.([60, 40, 60]); } catch {}
      }
    }
  }, [completo, vitoriaJaMostrada, isLoading]);

  const discMap = new Map(disciplinas.map((d) => [d.id, d]));
  const topMap = new Map((topicos ?? []).map((t) => [t.id, t]));

  const materiasFeitas = Array.from(new Set(
    plano.filter((a) => a.status === "concluido")
      .map((a) => discMap.get(a.disciplina_id)?.nome).filter(Boolean) as string[]
  ));

  return (
    <div className="space-y-3">
      <Card className={completo ? "border-emerald-500/40 bg-emerald-500/5" : ""}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold">📋 Seu plano de hoje</h2>
            <span className="ml-auto text-sm font-semibold tabular-nums">
              {concluidosMeta} de {totalMeta} concluídos
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          {completo && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Meta cumprida! Descanse bem.
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : plano.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum tópico disponível na sua grade pra hoje. Configure em Grade Semanal.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {plano.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <PlanoItem
                  numero={i + 1}
                  item={item}
                  topico={topMap.get(item.topico_id)}
                  disciplina={discMap.get(item.disciplina_id)}
                  onConcluir={() => concluirItem.mutate(item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {extras.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground flex items-center gap-1.5 px-1">
            <Plus className="w-3 h-3" /> Adicionados além do plano
          </div>
          <AnimatePresence initial={false}>
            {extras.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <PlanoItem
                  numero={null}
                  item={item}
                  topico={topMap.get(item.topico_id)}
                  disciplina={discMap.get(item.disciplina_id)}
                  onConcluir={() => concluirItem.mutate(item)}
                  extra
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {completo && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => addExtraMut.mutate()}
          disabled={addExtraMut.isPending}
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar mais 1 (extra)
        </Button>
      )}

      <VitoriaDialog
        open={vitoriaOpen}
        onOpenChange={setVitoriaOpen}
        meta={totalMeta}
        streak={streakMeta}
        totalSessoes={concluidosMeta + extras.filter((e) => e.status === "concluido").length}
        materias={materiasFeitas}
        onAdicionarMais={() => { setVitoriaOpen(false); addExtraMut.mutate(); }}
      />
    </div>
  );
}

function PlanoItem({
  numero, item, topico, disciplina, onConcluir, extra,
}: {
  numero: number | null;
  item: AgendaItem;
  topico: Topico | undefined;
  disciplina: Disciplina | undefined;
  onConcluir: () => void;
  extra?: boolean;
}) {
  const concluido = item.status === "concluido";
  const [pomoOpen, setPomoOpen] = useState(false);
  const proxima = topico ? proximaAcao(topico) : item.proxima_acao;

  return (
    <Card className={`overflow-hidden ${concluido ? "opacity-60 bg-muted/30" : ""}`}>
      <div className="h-1" style={{ backgroundColor: disciplina?.cor ?? "#888" }} />
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onConcluir}
            disabled={concluido}
            className="mt-0.5 shrink-0"
            aria-label={concluido ? "Concluído" : "Marcar como concluído"}
          >
            {concluido ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {numero !== null && (
                <span className="text-[10px] font-bold w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  {numero}
                </span>
              )}
              {extra && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-amber-400 text-amber-700">
                  EXTRA
                </Badge>
              )}
              <Badge variant="secondary"
                style={{ backgroundColor: `${disciplina?.cor}22`, color: disciplina?.cor }}
                className="text-[10px] h-4 px-1.5">
                {disciplina?.nome}
              </Badge>
            </div>
            <div className={`font-semibold leading-tight text-sm ${concluido ? "line-through" : ""}`}>
              {topico?.tema ?? "Tópico"}
            </div>
            {topico?.subtema && (
              <div className="text-[11px] text-muted-foreground truncate">{topico.subtema}</div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1">
              Próximo: <span className="font-semibold text-foreground">{proxima}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {!concluido && (
              <Button size="icon" variant="outline" className="h-7 w-7"
                onClick={() => setPomoOpen(true)} title="Pomodoro">
                <Timer className="w-3.5 h-3.5" />
              </Button>
            )}
            <Link to="/materias/$id" params={{ id: String(item.disciplina_id) }}>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <PomodoroDialog
          open={pomoOpen}
          onOpenChange={setPomoOpen}
          titulo={topico?.tema ?? ""}
          subtitulo={disciplina?.nome}
          cor={disciplina?.cor}
          onFocoCompleto={onConcluir}
        />
      </CardContent>
    </Card>
  );
}
