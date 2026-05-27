import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Target, CheckCircle2, Circle } from "lucide-react";
import { format, parseISO, differenceInWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/cronograma")({ component: CronogramaPage });

function CronogramaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-prova", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("data_prova, modo_atraso").eq("id", user!.id).single();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: fases } = useQuery({
    queryKey: ["cronograma-fases", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("cronograma_fases").select("*").eq("user_id", user!.id).order("numero_fase");
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  const { data: status } = useQuery({
    queryKey: ["cronograma-status", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("calcular_status_cronograma", { p_user_id: user!.id });
      return (data as any[])?.[0] ?? null;
    },
    enabled: !!user && !!profile?.data_prova,
  });

  const [dataProva, setDataProva] = useState("");
  const [modo, setModo] = useState<"rigoroso"|"compreensivo">("rigoroso");
  useEffect(() => {
    if (profile) {
      setDataProva(profile.data_prova ?? "");
      setModo(profile.modo_atraso ?? "rigoroso");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!dataProva) throw new Error("Defina a data da prova");
      const { error } = await supabase.from("profiles")
        .update({ data_prova: dataProva, modo_atraso: modo } as any)
        .eq("id", user!.id);
      if (error) throw error;
      const { error: e2 } = await supabase.rpc("inicializar_cronograma", { p_user_id: user!.id, p_data_prova: dataProva });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Cronograma recalculado");
      qc.invalidateQueries({ queryKey: ["cronograma-fases"] });
      qc.invalidateQueries({ queryKey: ["cronograma-status"] });
      qc.invalidateQueries({ queryKey: ["profile-prova"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const hoje = new Date();
  const faseAtualNum = status?.fase_atual_numero ?? 1;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/"><ArrowLeft className="w-4 h-4" /></Link></Button>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> Corrida pro ENEM
        </h1>
      </div>

      {profile?.data_prova && (
        <p className="text-sm text-muted-foreground">
          Prova: <strong>{format(parseISO(profile.data_prova), "dd/MM/yyyy", { locale: ptBR })}</strong>
        </p>
      )}

      <div className="space-y-2">
        {fases?.map((f) => {
          const inicio = parseISO(f.data_inicio);
          const fim = parseISO(f.data_fim);
          const semanas = Math.max(1, differenceInWeeks(fim, inicio) + 1);
          const ativa = hoje >= inicio && hoje <= fim;
          const concluida = hoje > fim;
          const isFaseAtualStatus = ativa && faseAtualNum === f.numero_fase;
          const feitos = isFaseAtualStatus ? status.feitos : 0;
          const pct = isFaseAtualStatus && f.meta_topicos_total > 0
            ? Math.round((feitos / f.meta_topicos_total) * 100) : 0;

          return (
            <Card key={f.id} className={ativa ? "border-2 border-primary" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {concluida ? <CheckCircle2 className="w-5 h-5 text-success" />
                    : ativa ? <Target className="w-5 h-5 text-primary" />
                    : <Circle className="w-5 h-5 text-muted-foreground" />}
                  <span className="font-semibold">Fase {f.numero_fase}: {f.nome}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(inicio, "dd/MM", { locale: ptBR })} → {format(fim, "dd/MM", { locale: ptBR })} ({semanas} semanas)
                </p>
                <p className="text-sm">{f.descricao}</p>
                {ativa && (
                  <div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{feitos} / {f.meta_topicos_total} · {pct}%</p>
                  </div>
                )}
                {!ativa && !concluida && <p className="text-xs text-muted-foreground italic">Não iniciada</p>}
                {concluida && <p className="text-xs text-success font-medium">Concluída</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Editar prova e modo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Data da prova</Label>
            <Input type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} />
          </div>
          <div>
            <Label>Modo de atraso</Label>
            <RadioGroup value={modo} onValueChange={(v) => setModo(v as any)} className="space-y-2 mt-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="rigoroso" className="mt-0.5" />
                <span><strong>Rigoroso</strong> — aumenta minha meta automaticamente</span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="compreensivo" className="mt-0.5" />
                <span><strong>Compreensivo</strong> — sugere ajustar o plano</span>
              </label>
            </RadioGroup>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
            Recalcular cronograma
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
