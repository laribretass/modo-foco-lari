import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Flame, Layers } from "lucide-react";
import { toast } from "sonner";
import { calcAnkiStreak } from "@/lib/anki";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils";

const ANKI_URL = "https://ankiweb.net/decks/";

export function AnkiCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: revisoes } = useQuery({
    queryKey: ["anki-revisoes", user?.id],
    queryFn: async () => {
      const desde = subDays(new Date(), 90).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("anki_revisoes_diarias")
        .select("data")
        .eq("user_id", user!.id)
        .gte("data", desde)
        .order("data", { ascending: false });
      return (data ?? []) as { data: string }[];
    },
    enabled: !!user,
  });

  const feitoHoje = revisoes?.some((r) => r.data === hoje) ?? false;
  const streak = calcAnkiStreak((revisoes ?? []).map((r) => r.data));

  const marcar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("anki_revisoes_diarias").insert({
        user_id: user!.id, data: hoje,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("Anki marcado! 🔥");
      qc.invalidateQueries({ queryKey: ["anki-revisoes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Card className={cn(
      "transition-colors",
      feitoHoje
        ? "border-success/40 bg-success/10"
        : "border-primary/30 bg-primary/5"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            feitoHoje ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
          )}>
            {feitoHoje ? <CheckCircle2 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-tight">
              {feitoHoje ? "Anki feito hoje" : "Revisão no Anki"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {feitoHoje ? "Manda ver no resto dos estudos." : "Hora dos seus flashcards diários"}
            </p>
            {streak > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-xs">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold tabular-nums">{streak}</span>
                <span className="text-muted-foreground">{streak === 1 ? "dia seguido" : "dias seguidos"}</span>
              </div>
            )}
          </div>
        </div>

        <Button
          asChild
          className="w-full"
          variant={feitoHoje ? "outline" : "default"}
        >
          <a href={ANKI_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            {feitoHoje ? "Abrir AnkiWeb novamente" : "📚 Abrir AnkiWeb"}
          </a>
        </Button>

        {!feitoHoje && (
          <button
            type="button"
            onClick={() => marcar.mutate()}
            disabled={marcar.isPending}
            className="w-full text-xs text-primary hover:underline disabled:opacity-50"
          >
            Já terminou? Marcar como feito hoje
          </button>
        )}
      </CardContent>
    </Card>
  );
}
