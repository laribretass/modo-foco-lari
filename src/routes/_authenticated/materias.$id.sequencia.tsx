import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Unlock, AlertTriangle, RefreshCw } from "lucide-react";
import { popularPrerequisitos } from "@/lib/sequencia.functions";
import { toast } from "sonner";
import type { Disciplina, Topico } from "@/lib/estudos";

export const Route = createFileRoute("/_authenticated/materias/$id/sequencia")({
  component: SequenciaPage,
});

type Prereq = { topico_id: number; prerequisito_topico_id: number };

function SequenciaPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const discId = Number(id);
  const sincronizar = useServerFn(popularPrerequisitos);

  const { data: disciplina } = useQuery({
    queryKey: ["disciplina", discId],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").eq("id", discId).single();
      return data as Disciplina;
    },
  });

  const { data: topicos } = useQuery({
    queryKey: ["seq-topicos", user?.id, discId],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("*")
        .eq("disciplina_id", discId)
        .order("ordem_didatica", { ascending: true })
        .order("tema", { ascending: true });
      return (data ?? []) as (Topico & { ordem_didatica: number; dominado: boolean })[];
    },
    enabled: !!user,
  });

  const { data: prereqs } = useQuery({
    queryKey: ["seq-prereqs", user?.id, discId],
    queryFn: async () => {
      const ids = (topicos ?? []).map((t) => t.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("topico_prerequisitos")
        .select("topico_id, prerequisito_topico_id")
        .in("topico_id", ids);
      return (data ?? []) as Prereq[];
    },
    enabled: !!topicos && topicos.length > 0,
  });

  const sync = useMutation({
    mutationFn: async () => {
      const r = await sincronizar();
      if (r.error) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => {
      toast.success(`${r.inseridos} vínculo${r.inseridos === 1 ? "" : "s"} sincronizado${r.inseridos === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["seq-topicos"] });
      qc.invalidateQueries({ queryKey: ["seq-prereqs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const dominadoMap = new Map((topicos ?? []).map((t) => [t.id, t.dominado]));
  const prereqsByTopico = new Map<number, number[]>();
  (prereqs ?? []).forEach((p) => {
    const arr = prereqsByTopico.get(p.topico_id) ?? [];
    arr.push(p.prerequisito_topico_id);
    prereqsByTopico.set(p.topico_id, arr);
  });

  function statusOf(t: { id: number; dominado: boolean }): "dominado" | "liberado" | "espera" {
    if (t.dominado) return "dominado";
    const reqs = prereqsByTopico.get(t.id) ?? [];
    if (reqs.length === 0) return "liberado";
    const todosDominados = reqs.every((rid) => dominadoMap.get(rid) === true);
    return todosDominados ? "liberado" : "espera";
  }

  return (
    <div className="p-4 space-y-4">
      <Link to="/materias/$id" params={{ id }} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Link>

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{disciplina?.area}</div>
          <h1 className="text-2xl font-display font-bold" style={{ color: disciplina?.cor }}>
            {disciplina?.nome} — Sequência didática
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Por onde começar e a ordem natural pra estudar.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {topicos?.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sem tópicos nessa matéria ainda.
        </CardContent></Card>
      )}

      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-2">
          {(topicos ?? []).map((t) => {
            const st = statusOf(t);
            return (
              <Link
                key={t.id}
                to="/materias/$id"
                params={{ id }}
                className="relative flex items-start gap-3 pl-0 pr-2 py-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="relative z-10 mt-1 shrink-0">
                  {st === "dominado" && (
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  {st === "liberado" && (
                    <div className="w-9 h-9 rounded-full bg-sky-500/15 border-2 border-sky-500 flex items-center justify-center">
                      <Unlock className="w-4 h-4 text-sky-600" />
                    </div>
                  )}
                  {st === "espera" && (
                    <div className="w-9 h-9 rounded-full bg-amber-400/15 border-2 border-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1.5">
                  <div className="font-medium text-sm leading-tight truncate">{t.tema}</div>
                  {t.subtema && (
                    <div className="text-[11px] text-muted-foreground truncate">{t.subtema}</div>
                  )}
                </div>
                <div className="pt-1.5 shrink-0">
                  {st === "dominado" && <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">DOMINADO</Badge>}
                  {st === "liberado" && <Badge variant="outline" className="text-[10px] border-sky-400 text-sky-600">liberado</Badge>}
                  {st === "espera" && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">aguarda pré-req</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
