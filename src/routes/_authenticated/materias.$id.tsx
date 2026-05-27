import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, ChevronDown, Trash2, GitBranch, AlertTriangle, CheckCircle2 } from "lucide-react";
import { progressoTopico, pctAcerto, proximaAcao, type Topico, type Disciplina } from "@/lib/estudos";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PrerequisitosDialog } from "@/components/PrerequisitosDialog";

type TopicoExt = Topico & { dominado?: boolean; ordem_didatica?: number };

export const Route = createFileRoute("/_authenticated/materias/$id")({ component: MateriaDetail });

function MateriaDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const discId = Number(id);

  const { data: disciplina } = useQuery({
    queryKey: ["disciplina", discId],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").eq("id", discId).single();
      return data as Disciplina;
    },
  });

  const { data: topicos } = useQuery({
    queryKey: ["topicos", user?.id, discId],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("*")
        .eq("disciplina_id", discId).order("tema");
      return (data ?? []) as TopicoExt[];
    },
    enabled: !!user,
  });

  // Quais tópicos têm pré-req pendente? Pega vínculos e cruza com .dominado
  const { data: pendentesIds } = useQuery({
    queryKey: ["topicos-pendentes-prereq", user?.id, discId, topicos?.length],
    queryFn: async () => {
      const ids = (topicos ?? []).map((t) => t.id);
      if (ids.length === 0) return new Set<number>();
      const { data: pr } = await supabase.from("topico_prerequisitos")
        .select("topico_id, prerequisito_topico_id")
        .in("topico_id", ids);
      const pids = Array.from(new Set((pr ?? []).map((r) => r.prerequisito_topico_id)));
      if (pids.length === 0) return new Set<number>();
      const { data: doms } = await supabase.from("topicos").select("id, dominado").in("id", pids);
      const domMap = new Map((doms ?? []).map((d: any) => [d.id, d.dominado as boolean]));
      const set = new Set<number>();
      (pr ?? []).forEach((row) => {
        if (!domMap.get(row.prerequisito_topico_id)) set.add(row.topico_id);
      });
      return set;
    },
    enabled: !!topicos && topicos.length > 0,
  });

  const addTopico = useMutation({
    mutationFn: async (v: { tema: string; subtema: string; recorrencia: string }) => {
      const { error } = await supabase.from("topicos").insert({
        user_id: user!.id, disciplina_id: discId, ...v,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tópico adicionado");
      qc.invalidateQueries({ queryKey: ["topicos"] });
    },
  });

  return (
    <div className="p-4 space-y-4">
      <Link to="/materias" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Matérias
      </Link>
      {disciplina && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{disciplina.area}</div>
            <h1 className="text-2xl font-display font-bold truncate" style={{ color: disciplina.cor }}>{disciplina.nome}</h1>
            <div className="text-sm text-muted-foreground mt-1">{topicos?.length ?? 0} tópicos</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/materias/$id/sequencia" params={{ id }}>
              <Button variant="outline" size="sm">
                <GitBranch className="w-3.5 h-3.5 mr-1" /> Sequência
              </Button>
            </Link>
            <AddTopicoDialog onSubmit={(v) => addTopico.mutate(v)} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {topicos?.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum tópico ainda. Toque em "+" para adicionar.
          </CardContent></Card>
        )}
        {topicos?.map((t) => (
          <TopicoRow
            key={t.id}
            topico={t}
            cor={disciplina?.cor ?? "#888"}
            disciplinaId={discId}
            temPendente={pendentesIds?.has(t.id) ?? false}
          />
        ))}
      </div>
    </div>
  );
}

function TopicoRow({
  topico, cor, disciplinaId, temPendente,
}: { topico: TopicoExt; cor: string; disciplinaId: number; temPendente: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const prog = progressoTopico(topico);
  const pct = pctAcerto(topico);

  const update = useMutation({
    mutationFn: async (patch: Partial<Topico>) => {
      const { error } = await supabase.from("topicos")
        .update({ ...patch, ultima_atividade: new Date().toISOString() })
        .eq("id", topico.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });

  const del = useMutation({
    mutationFn: async () => { await supabase.from("topicos").delete().eq("id", topico.id); },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["topicos"] }); },
  });

  const [prereqOpen, setPrereqOpen] = useState(false);

  return (
    <Card className={topico.dominado ? "border-emerald-500/40" : temPendente ? "border-amber-400/50" : ""}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {topico.dominado && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <h3 className="font-medium truncate">{topico.tema}</h3>
                <Badge variant="outline" className="text-[10px]">{topico.recorrencia}</Badge>
                {topico.dominado && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                    DOMINADO
                  </Badge>
                )}
                {!topico.dominado && temPendente && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPrereqOpen(true); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPrereqOpen(true); } }}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 cursor-pointer"
                  >
                    <AlertTriangle className="w-3 h-3" /> Ver pré-requisitos
                  </span>
                )}
              </div>
              {topico.subtema && <p className="text-xs text-muted-foreground truncate">{topico.subtema}</p>}
              <div className="mt-2 flex items-center gap-2">
                <Progress value={prog} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground w-10 text-right">{prog}%</span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Checkpoint label="Pré-aula" value={topico.pre_aula_feita}
                onChange={(v) => update.mutate({ pre_aula_feita: v })} />
              <Checkpoint label="Teoria" value={topico.teoria_feita}
                onChange={(v) => update.mutate({ teoria_feita: v, teoria_data: v ? new Date().toISOString() : null })} />
              <Checkpoint label="Mapeamento" value={topico.mapeamento_feito}
                onChange={(v) => update.mutate({ mapeamento_feito: v, mapeamento_data: v ? new Date().toISOString() : null })} />
              <Checkpoint label="Revisão 1" value={topico.revisao1_feita}
                onChange={(v) => update.mutate({ revisao1_feita: v, revisao1_data: v ? new Date().toISOString() : null })} />
              <Checkpoint label="Revisão 2" value={topico.revisao2_feita}
                onChange={(v) => update.mutate({ revisao2_feita: v, revisao2_data: v ? new Date().toISOString() : null })} />
              <Checkpoint label="Flashcards" value={topico.flashcards_feitos}
                onChange={(v) => update.mutate({ flashcards_feitos: v })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Questões feitas</Label>
                <Input type="number" min={0} defaultValue={topico.questoes_feitas}
                  onBlur={(e) => update.mutate({ questoes_feitas: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Acertos</Label>
                <Input type="number" min={0} defaultValue={topico.questoes_acertos}
                  onBlur={(e) => update.mutate({ questoes_acertos: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Recorrência</Label>
              <Select value={topico.recorrencia} onValueChange={(v) => update.mutate({ recorrencia: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} defaultValue={topico.observacoes ?? ""}
                onBlur={(e) => update.mutate({ observacoes: e.target.value })} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Próximo: <span className="font-semibold text-foreground">{proximaAcao(topico)}</span>
                {pct !== null && ` · ${pct}% acerto`}
              </span>
              <Button variant="ghost" size="sm" className="text-destructive h-7"
                onClick={() => del.mutate()}>
                <Trash2 className="w-3 h-3 mr-1" /> Excluir
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <PrerequisitosDialog
        open={prereqOpen}
        onOpenChange={setPrereqOpen}
        topicoId={topico.id}
        topicoTema={topico.tema}
        disciplinaId={disciplinaId}
      />
    </Card>
  );
}

function Checkpoint({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
      <Checkbox checked={value} onCheckedChange={(v) => onChange(!!v)} />
      <span className={value ? "line-through text-muted-foreground" : ""}>{label}</span>
    </label>
  );
}

function AddTopicoDialog({ onSubmit }: { onSubmit: (v: { tema: string; subtema: string; recorrencia: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [tema, setTema] = useState("");
  const [subtema, setSubtema] = useState("");
  const [recorrencia, setRecorrencia] = useState("Média");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon"><Plus className="w-4 h-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo tópico</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tema</Label><Input value={tema} onChange={(e) => setTema(e.target.value)} /></div>
          <div><Label>Subtema (opcional)</Label><Input value={subtema} onChange={(e) => setSubtema(e.target.value)} /></div>
          <div>
            <Label>Recorrência no ENEM</Label>
            <Select value={recorrencia} onValueChange={setRecorrencia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (tema) { onSubmit({ tema, subtema, recorrencia }); setOpen(false); setTema(""); setSubtema(""); } }}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
