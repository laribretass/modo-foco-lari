import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type Sessao = {
  id: number;
  questoes_feitas: number;
  questoes_acertos: number;
  data: string;
  hora: string;
  observacao: string | null;
};

export function RegistrarSessaoQuestoes({
  topicoId,
  teoriaFeita,
}: {
  topicoId: number;
  teoriaFeita: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [feitas, setFeitas] = useState<string>("");
  const [acertos, setAcertos] = useState<string>("");
  const [obs, setObs] = useState("");
  const [edit, setEdit] = useState<Sessao | null>(null);

  const { data: sessoes } = useQuery({
    queryKey: ["sessoes-questoes", topicoId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessoes_questoes" as any)
        .select("id, questoes_feitas, questoes_acertos, data, hora, observacao")
        .eq("topico_id", topicoId)
        .order("hora", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Sessao[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sessoes-questoes", topicoId] });
    qc.invalidateQueries({ queryKey: ["topicos"] });
    qc.invalidateQueries({ queryKey: ["questoes-hoje"] });
  };

  const registrar = useMutation({
    mutationFn: async () => {
      const f = Number(feitas);
      const a = Number(acertos);
      if (!Number.isFinite(f) || f < 1) throw new Error("Informe ao menos 1 questão feita");
      if (!Number.isFinite(a) || a < 0) throw new Error("Acertos inválidos");
      if (a > f) throw new Error("Acertos não pode ser maior que feitas");
      const { error } = await supabase.from("sessoes_questoes" as any).insert({
        user_id: user!.id,
        topico_id: topicoId,
        questoes_feitas: f,
        questoes_acertos: a,
        observacao: obs || null,
      });
      if (error) throw error;
      return f;
    },
    onSuccess: (f) => {
      toast.success(`Sessão registrada! +${f} questões`);
      setFeitas(""); setAcertos(""); setObs("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });

  const deletar = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("sessoes_questoes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sessão apagada"); invalidate(); },
  });

  const salvarEdit = useMutation({
    mutationFn: async (s: Sessao) => {
      if (s.questoes_acertos > s.questoes_feitas) throw new Error("Acertos > feitas");
      const { error } = await supabase.from("sessoes_questoes" as any).update({
        questoes_feitas: s.questoes_feitas,
        questoes_acertos: s.questoes_acertos,
        observacao: s.observacao,
      }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sessão atualizada"); setEdit(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  if (!teoriaFeita) {
    return (
      <Card className="border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="p-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
          <span>Estude a teoria antes de registrar questões deste tópico.</span>
        </CardContent>
      </Card>
    );
  }

  const atalhos = [5, 10, 15, 20];

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="text-sm font-semibold">📝 Registrar sessão de questões</div>

          <div>
            <Label className="text-xs">Quantas questões você fez?</Label>
            <div className="flex gap-1 mt-1 mb-1">
              {atalhos.map((n) => (
                <Button key={n} type="button" variant="outline" size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFeitas(String(n))}>
                  +{n}
                </Button>
              ))}
            </div>
            <Input type="number" min={1} value={feitas}
              onChange={(e) => setFeitas(e.target.value)} placeholder="ex: 10" />
          </div>

          <div>
            <Label className="text-xs">Quantas você acertou?</Label>
            <Input type="number" min={0} value={acertos}
              onChange={(e) => setAcertos(e.target.value)} placeholder="ex: 7" />
          </div>

          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>

          <Button className="w-full" onClick={() => registrar.mutate()}
            disabled={registrar.isPending}>
            Registrar sessão
          </Button>
        </CardContent>
      </Card>

      {(sessoes?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="text-sm font-semibold">📜 Histórico de sessões</div>
            <ul className="divide-y">
              {sessoes!.map((s) => {
                const pct = s.questoes_feitas > 0
                  ? Math.round((s.questoes_acertos / s.questoes_feitas) * 100) : 0;
                return (
                  <li key={s.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium tabular-nums">
                        {format(new Date(s.hora), "dd/MM HH:mm")}
                        {" · "}{s.questoes_feitas}q · {s.questoes_acertos} acertos
                      </div>
                      <div className="text-muted-foreground">({pct}%)</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm("Apagar esta sessão?")) deletar.mutate(s.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar sessão</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Questões feitas</Label>
                <Input type="number" min={1} value={edit.questoes_feitas}
                  onChange={(e) => setEdit({ ...edit, questoes_feitas: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Acertos</Label>
                <Input type="number" min={0} value={edit.questoes_acertos}
                  onChange={(e) => setEdit({ ...edit, questoes_acertos: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Observação</Label>
                <Textarea rows={2} value={edit.observacao ?? ""}
                  onChange={(e) => setEdit({ ...edit, observacao: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={() => edit && salvarEdit.mutate(edit)} disabled={salvarEdit.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
