import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Topico, Disciplina } from "@/lib/estudos";

export function QuickQuestionsFAB() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [topicoId, setTopicoId] = useState<string>("");
  const [feitas, setFeitas] = useState("10");
  const [acertos, setAcertos] = useState("7");

  const { data: topicos } = useQuery({
    queryKey: ["topicos-fab", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("id, tema, disciplina_id, questoes_feitas, questoes_acertos").order("tema");
      return (data ?? []) as Pick<Topico, "id" | "tema" | "disciplina_id" | "questoes_feitas" | "questoes_acertos">[];
    },
    enabled: !!user && open,
  });

  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").order("id");
      return (data ?? []) as Disciplina[];
    },
    enabled: open,
  });

  const discMap = new Map(disciplinas?.map((d) => [d.id, d]) ?? []);

  const registrar = useMutation({
    mutationFn: async () => {
      const t = topicos?.find((x) => x.id === Number(topicoId));
      if (!t) throw new Error("Escolha um tópico");
      const f = Math.max(0, Number(feitas));
      const a = Math.max(0, Math.min(f, Number(acertos)));
      const { error } = await supabase.from("topicos").update({
        questoes_feitas: t.questoes_feitas + f,
        questoes_acertos: t.questoes_acertos + a,
        ultima_atividade: new Date().toISOString(),
      }).eq("id", t.id);
      if (error) throw error;

      // registra sessão (idempotente via unique index)
      await supabase.from("sessoes_estudo").upsert({
        user_id: user!.id, topico_id: t.id, tipo_atividade: "Questões",
        data: new Date().toISOString().slice(0, 10), concluido: true,
        concluido_em: new Date().toISOString(),
      }, { onConflict: "user_id,topico_id,data,tipo_atividade" });
    },
    onSuccess: () => {
      toast.success("Questões registradas!");
      qc.invalidateQueries();
      setOpen(false);
      setFeitas("10"); setAcertos("7");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Registrar questões rapidamente"
        className="fixed z-40 bottom-20 lg:bottom-6 right-4 lg:right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar questões</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tópico</Label>
              <Select value={topicoId} onValueChange={setTopicoId}>
                <SelectTrigger><SelectValue placeholder="Escolha o tópico..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {topicos?.map((t) => {
                    const d = discMap.get(t.disciplina_id);
                    return (
                      <SelectItem key={t.id} value={String(t.id)}>
                        <span className="text-xs text-muted-foreground mr-1">{d?.nome.split(" ")[0]}</span>
                        {t.tema}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Feitas</Label>
                <Input type="number" min={1} value={feitas} onChange={(e) => setFeitas(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Acertos</Label>
                <Input type="number" min={0} value={acertos} onChange={(e) => setAcertos(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => registrar.mutate()} disabled={!topicoId || registrar.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
