import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { Disciplina } from "@/lib/estudos";

export const Route = createFileRoute("/_authenticated/simulados")({ component: SimuladosPage });

const TIPOS_ERRO = [
  { id: 1, label: "Não sabia o conteúdo" },
  { id: 2, label: "Erro de interpretação" },
  { id: 3, label: "Erro de cálculo/atenção" },
  { id: 4, label: "Confundi alternativas" },
  { id: 5, label: "Não terminei a tempo" },
];

function SimuladosPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-display font-bold">Simulados</h1>
      <Tabs defaultValue="geral">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="caixa">Caixa Preta</TabsTrigger>
        </TabsList>
        <TabsContent value="geral" className="mt-4"><SimuladosGeral /></TabsContent>
        <TabsContent value="caixa" className="mt-4"><CaixaPreta /></TabsContent>
      </Tabs>
    </div>
  );
}

function SimuladosGeral() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: sims } = useQuery({
    queryKey: ["simulados", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("simulados").select("*").order("data", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const add = useMutation({
    mutationFn: async (v: any) => { const { error } = await supabase.from("simulados").insert({ ...v, user_id: user!.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Simulado registrado"); qc.invalidateQueries({ queryKey: ["simulados"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from("simulados").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulados"] }),
  });

  const chart = [...(sims ?? [])].reverse().map((s) => ({
    nome: s.nome.slice(0, 10),
    total: (s.linguagens_acertos ?? 0) + (s.humanas_acertos ?? 0) + (s.naturezas_acertos ?? 0) + (s.matematica_acertos ?? 0),
  }));

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><AddSimDialog onSubmit={(v) => add.mutate(v)} /></div>
      {chart.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução de acertos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chart}>
                <XAxis dataKey="nome" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {sims?.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{s.nome}</h3>
                  <p className="text-xs text-muted-foreground">{s.data}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate(s.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-center">
                <Stat label="LC" value={s.linguagens_acertos} />
                <Stat label="CH" value={s.humanas_acertos} />
                <Stat label="CN" value={s.naturezas_acertos} />
                <Stat label="MT" value={s.matematica_acertos} />
              </div>
              {s.redacao_nota != null && <div className="mt-2 text-xs">Redação: <b>{s.redacao_nota}</b></div>}
            </CardContent>
          </Card>
        ))}
        {(!sims || sims.length === 0) && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum simulado ainda</CardContent></Card>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div className="p-1.5 rounded bg-muted"><div className="font-bold">{value ?? "-"}</div><div className="text-muted-foreground">{label}</div></div>;
}

function AddSimDialog({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", data: new Date().toISOString().slice(0, 10),
    linguagens_acertos: 0, humanas_acertos: 0, naturezas_acertos: 0, matematica_acertos: 0, redacao_nota: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo simulado</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo simulado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            {(["linguagens_acertos", "humanas_acertos", "naturezas_acertos", "matematica_acertos"] as const).map((k) => (
              <div key={k}><Label className="text-xs">{k.split("_")[0]}</Label>
                <Input type="number" value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div><Label>Redação</Label><Input type="number" value={form.redacao_nota} onChange={(e) => setForm({ ...form, redacao_nota: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => { if (form.nome) { onSubmit({ ...form, redacao_nota: form.redacao_nota ? Number(form.redacao_nota) : null }); setOpen(false); } }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CaixaPreta() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: qs } = useQuery({
    queryKey: ["caixa-preta", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("caixa_preta_questoes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });
  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => { const { data } = await supabase.from("disciplinas").select("*"); return (data ?? []) as Disciplina[]; },
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => { await supabase.from("caixa_preta_questoes").update(patch).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caixa-preta"] }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => { await supabase.from("caixa_preta_questoes").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caixa-preta"] }),
  });
  const add = useMutation({
    mutationFn: async (v: any) => { const { error } = await supabase.from("caixa_preta_questoes").insert({ ...v, user_id: user!.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Questão adicionada"); qc.invalidateQueries({ queryKey: ["caixa-preta"] }); },
  });

  const pendentes = qs?.filter((q) => !q.passo4_flashcard) ?? [];
  const concluidas = qs?.filter((q) => q.passo4_flashcard) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="secondary">{pendentes.length} pendentes</Badge>
          <Badge variant="outline">{concluidas.length} concluídas</Badge>
        </div>
        <AddCaixaDialog disciplinas={disciplinas ?? []} onSubmit={(v) => add.mutate(v)} />
      </div>
      <div className="space-y-2">
        {qs?.map((q) => {
          const disc = disciplinas?.find((d) => d.id === q.disciplina_id);
          const passos = ["passo1_refazer", "passo2_voltar_conteudo", "passo3_resolucao_comentada", "passo4_flashcard"];
          const labels = ["Refazer", "Voltar ao conteúdo", "Resolução comentada", "Flashcard"];
          const done = passos.filter((p) => (q as any)[p]).length;
          return (
            <Card key={q.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 items-center">
                      {disc && <Badge style={{ backgroundColor: `${disc.cor}22`, color: disc.cor }}>{disc.nome}</Badge>}
                      {q.numero_questao && <span className="text-xs text-muted-foreground">Q{q.numero_questao}</span>}
                    </div>
                    {q.assunto && <p className="text-sm mt-1">{q.assunto}</p>}
                    {q.tipo_erro && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />{TIPOS_ERRO.find((t) => t.id === q.tipo_erro)?.label}
                    </p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate(q.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {passos.map((p, i) => (
                    <label key={p} className="flex items-center gap-1.5 p-1.5 rounded hover:bg-muted/50">
                      <Checkbox checked={(q as any)[p]} onCheckedChange={(v) => update.mutate({ id: q.id, patch: { [p]: !!v } })} />
                      {labels[i]}
                    </label>
                  ))}
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(done / 4) * 100}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!qs || qs.length === 0) && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Sem questões na caixa preta</CardContent></Card>}
      </div>
    </div>
  );
}

function AddCaixaDialog({ disciplinas, onSubmit }: { disciplinas: Disciplina[]; onSubmit: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ disciplina_id: "", assunto: "", numero_questao: "", tipo_erro: "", observacoes: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Adicionar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Questão da caixa preta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Disciplina</Label>
            <Select value={form.disciplina_id} onValueChange={(v) => setForm({ ...form, disciplina_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{disciplinas.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nº questão</Label><Input type="number" value={form.numero_questao} onChange={(e) => setForm({ ...form, numero_questao: e.target.value })} /></div>
            <div>
              <Label>Tipo de erro</Label>
              <Select value={form.tipo_erro} onValueChange={(v) => setForm({ ...form, tipo_erro: v })}>
                <SelectTrigger><SelectValue placeholder="?" /></SelectTrigger>
                <SelectContent>{TIPOS_ERRO.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Assunto</Label><Input value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onSubmit({ ...form,
              disciplina_id: form.disciplina_id ? Number(form.disciplina_id) : null,
              numero_questao: form.numero_questao ? Number(form.numero_questao) : null,
              tipo_erro: form.tipo_erro ? Number(form.tipo_erro) : null });
            setOpen(false);
          }}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
