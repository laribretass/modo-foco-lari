import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Disciplina } from "@/lib/estudos";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const Route = createFileRoute("/_authenticated/grade")({ component: GradePage });

function GradePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: grade } = useQuery({
    queryKey: ["grade", user?.id],
    queryFn: async () => { const { data } = await supabase.from("grade_semanal").select("*").order("ordem"); return data ?? []; },
    enabled: !!user,
  });
  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => { const { data } = await supabase.from("disciplinas").select("*").order("id"); return (data ?? []) as Disciplina[]; },
  });

  const add = useMutation({
    mutationFn: async ({ dia, disciplina_id }: { dia: number; disciplina_id: number }) => {
      const ordem = (grade?.filter((g) => g.dia_semana === dia).length ?? 0);
      const { error } = await supabase.from("grade_semanal").insert({ user_id: user!.id, dia_semana: dia, disciplina_id, ordem });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adicionado"); qc.invalidateQueries({ queryKey: ["grade"] }); },
  });
  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from("grade_semanal").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grade"] }),
  });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-3xl font-display font-bold">Grade Semanal</h1>
      <p className="text-sm text-muted-foreground">Defina quais disciplinas estudar em cada dia.</p>
      {DIAS.map((dia, idx) => {
        const items = grade?.filter((g) => g.dia_semana === idx) ?? [];
        return (
          <Card key={idx}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{dia}</h3>
                <AddBtn disciplinas={disciplinas ?? []} onAdd={(disc) => add.mutate({ dia: idx, disciplina_id: disc })} />
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((g) => {
                  const d = disciplinas?.find((dd) => dd.id === g.disciplina_id);
                  return (
                    <div key={g.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${d?.cor}22`, color: d?.cor }}>
                      {d?.nome}
                      <button onClick={() => del.mutate(g.id)}><X className="w-3 h-3" /></button>
                    </div>
                  );
                })}
                {items.length === 0 && <span className="text-xs text-muted-foreground">Dia livre</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AddBtn({ disciplinas, onAdd }: { disciplinas: Disciplina[]; onAdd: (id: number) => void }) {
  return (
    <Select onValueChange={(v) => onAdd(Number(v))}>
      <SelectTrigger className="w-auto h-7 text-xs"><Plus className="w-3 h-3 mr-1" /><SelectValue placeholder="Adicionar" /></SelectTrigger>
      <SelectContent>{disciplinas.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
    </Select>
  );
}
