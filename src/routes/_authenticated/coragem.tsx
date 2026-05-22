import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Disciplina } from "@/lib/estudos";

export const Route = createFileRoute("/_authenticated/coragem")({ component: CoragemPage });

function CoragemPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items } = useQuery({
    queryKey: ["coragem", user?.id],
    queryFn: async () => { const { data } = await supabase.from("ferramenta_coragem").select("*").order("created_at", { ascending: false }); return data ?? []; },
    enabled: !!user,
  });
  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"], queryFn: async () => { const { data } = await supabase.from("disciplinas").select("*"); return (data ?? []) as Disciplina[]; },
  });
  const add = useMutation({
    mutationFn: async (v: any) => { const { error } = await supabase.from("ferramenta_coragem").insert({ ...v, user_id: user!.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Adicionado à sua caixa de coragem 💪"); qc.invalidateQueries({ queryKey: ["coragem"] }); },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => { await supabase.from("ferramenta_coragem").update(patch).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coragem"] }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from("ferramenta_coragem").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coragem"] }),
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Heart className="w-7 h-7 text-destructive" /> Caixa de Coragem
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Aqueles assuntos que você foge. Encare um por vez.</p>
        </div>
        <AddDialog disciplinas={disciplinas ?? []} onSubmit={(v) => add.mutate(v)} />
      </div>
      <div className="space-y-2">
        {items?.map((it) => {
          const d = disciplinas?.find((dd) => dd.id === it.disciplina_id);
          return (
            <Card key={it.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 items-center">
                      {d && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${d.cor}22`, color: d.cor }}>{d.nome}</span>}
                      {it.importancia && <span className="text-xs text-muted-foreground">· {it.importancia}</span>}
                    </div>
                    <h3 className="font-semibold mt-1">{it.tema}</h3>
                    {it.capitulo && <p className="text-xs text-muted-foreground">{it.capitulo}</p>}
                    {it.observacoes && <p className="text-xs mt-1">{it.observacoes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate(it.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1.5"><Checkbox checked={it.teoria_feita} onCheckedChange={(v) => update.mutate({ id: it.id, patch: { teoria_feita: !!v } })} /> Teoria</label>
                  <label className="flex items-center gap-1.5"><Checkbox checked={it.questoes_feitas} onCheckedChange={(v) => update.mutate({ id: it.id, patch: { questoes_feitas: !!v } })} /> Questões</label>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!items || items.length === 0) && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sua caixa está vazia. Coragem!</CardContent></Card>}
      </div>
    </div>
  );
}

function AddDialog({ disciplinas, onSubmit }: { disciplinas: Disciplina[]; onSubmit: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ disciplina_id: "", tema: "", capitulo: "", importancia: "Média", observacoes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Adicionar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Encarar um medo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Disciplina</Label>
            <Select value={f.disciplina_id} onValueChange={(v) => setF({ ...f, disciplina_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{disciplinas.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tema</Label><Input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} /></div>
          <div><Label>Capítulo</Label><Input value={f.capitulo} onChange={(e) => setF({ ...f, capitulo: e.target.value })} /></div>
          <div>
            <Label>Importância</Label>
            <Select value={f.importancia} onValueChange={(v) => setF({ ...f, importancia: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Por quê foge?</Label><Textarea rows={2} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onSubmit({ ...f, disciplina_id: f.disciplina_id ? Number(f.disciplina_id) : null }); setOpen(false); }}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
