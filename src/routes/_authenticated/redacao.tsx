import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/redacao")({ component: RedacaoPage });

function RedacaoPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: redacoes } = useQuery({
    queryKey: ["redacoes", user?.id],
    queryFn: async () => { const { data } = await supabase.from("caixa_preta_redacao").select("*").order("data", { ascending: false }); return data ?? []; },
    enabled: !!user,
  });
  const add = useMutation({
    mutationFn: async (v: any) => { const { error } = await supabase.from("caixa_preta_redacao").insert({ ...v, user_id: user!.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Redação adicionada"); qc.invalidateQueries({ queryKey: ["redacoes"] }); },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => { await supabase.from("caixa_preta_redacao").update(patch).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redacoes"] }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from("caixa_preta_redacao").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redacoes"] }),
  });

  const total = (r: any) => r.c1 + r.c2 + r.c3 + r.c4 + r.c5;
  const chart = [...(redacoes ?? [])].reverse().map((r) => ({ data: r.data?.slice(5) ?? "", nota: total(r), reescrita: r.nota_reescrita ?? null }));
  const media = redacoes && redacoes.length > 0 ? Math.round(redacoes.reduce((s, r) => s + total(r), 0) / redacoes.length) : 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold">Redação</h1>
        <AddDialog onSubmit={(v) => add.mutate(v)} />
      </div>
      <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Média</div><div className="text-3xl font-bold">{media}</div></CardContent></Card>
      {chart.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chart}>
                <XAxis dataKey="data" fontSize={11} /><YAxis domain={[0, 1000]} fontSize={11} /><Tooltip />
                <Line type="monotone" dataKey="nota" stroke="var(--primary)" strokeWidth={2} />
                <Line type="monotone" dataKey="reescrita" stroke="var(--success)" strokeWidth={2} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {redacoes?.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{r.tema ?? "Sem tema"}</h3>
                  <p className="text-xs text-muted-foreground">{r.data}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{total(r)}</div>
                  {r.nota_reescrita && <div className="text-xs text-success">↑ {r.nota_reescrita}</div>}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1 text-xs text-center">
                {[1,2,3,4,5].map((i) => <div key={i} className="p-1 bg-muted rounded"><div className="font-bold">{(r as any)["c"+i]}</div><div className="text-muted-foreground">C{i}</div></div>)}
              </div>
              <div className="flex gap-3 text-xs">
                <label className="flex items-center gap-1.5"><Checkbox checked={r.correcao_feita} onCheckedChange={(v) => update.mutate({ id: r.id, patch: { correcao_feita: !!v } })} /> Correção feita</label>
                <label className="flex items-center gap-1.5"><Checkbox checked={r.reescrita_feita} onCheckedChange={(v) => update.mutate({ id: r.id, patch: { reescrita_feita: !!v } })} /> Reescrita</label>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-destructive" onClick={() => del.mutate(r.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!redacoes || redacoes.length === 0) && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma redação ainda</CardContent></Card>}
      </div>
    </div>
  );
}

function AddDialog({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ tema: "", data: new Date().toISOString().slice(0, 10), c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, tempo_minutos: "", observacoes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Nova</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova redação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tema</Label><Input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i}><Label className="text-xs">C{i}</Label>
                <Input type="number" min={0} max={200} step={20} value={f["c"+i]} onChange={(e) => setF({ ...f, ["c"+i]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div><Label>Tempo (min)</Label><Input type="number" value={f.tempo_minutos} onChange={(e) => setF({ ...f, tempo_minutos: e.target.value })} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onSubmit({ ...f, tempo_minutos: f.tempo_minutos ? Number(f.tempo_minutos) : null }); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
